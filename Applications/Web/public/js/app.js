var app = {
	// Fonction d'initialisation de l'application
	initialize : function() {
		// Périmètre de recherche par défaut
		this.perimeter = 1000;
		
		// Création de la carte
		this.map = new QuickitiMap('map');

		this.map
			.initialize()
			.geolocate(function(err, result) {
				// Position de l'utilisateur trouvée
				if(!err) {
					// Ajout du marker de position
					app.map
						.addMarker({
							latitude: result.coords.latitude,
							longitude: result.coords.longitude,
							message: "Vous êtes ici"})
						.centerMarkers();

					// Demande des arrêts à proximités
					socketWebServer.emit('request', 'stopsNearTo', [{
						latitude: result.coords.latitude,
						longitude: result.coords.longitude
					}, app.perimeter], function(err, d) {
						if(!err) {
							if(d) {
								for(var i in d) {
									app.map.addMarker({
										latitude: d[i].location[0],
										longitude: d[i].location[1],
										message: '<strong>'+d[i].stop_name+'</strong>'
									});
								}
								app.map.centerMarkers();
							}
						}
						else console.log(err);
					});
				}
				
				// Position de l'utilisateur introuvable
				else {
					// Affichage du message d'erreur
					alert("Votre position géographique ne peut être trouvée");
					console.log(err);
				}
			});

		// Attachement des événements
		this.bindEvents();
	},

	// Fonction d'attachement des événements
	bindEvents : function() {
		var simpleSearch = document.getElementById('simpleSearch'),
			routeSearch = document.querySelector('#routesSearch');

		// Navigation par onglets
		this.screenChangeEvent(document.querySelectorAll('.screens-card .nav-screens li'));

		// Recherche simple / Recherche autour d'un point
		simpleSearch.addEventListener('submit', this.simpleSearchSubmit); // Submit
		simpleSearch.addEventListener('keyup', this.searchSuggest); // Suggestion

		// Recherche d'itinéraire
		routeSearch.addEventListener('submit', this.routeSearchSubmit); // Submit
		routeSearch.addEventListener('keyup', this.searchSuggest); // Suggestion
	},

	// Fonction de navigation par onglets
	screenChangeEvent : function(screensLi) {
		for(var i=0; i<screensLi.length; i++) {
			screensLi[i].onclick = function() {
				var screensCard = this.parentNode.parentNode;
				// Retirer ancien lien actif
				screensCard.querySelector('.nav-screens li.actif').removeAttribute('class');

				// Mettre le nouveau lien en actif
				this.setAttribute('class', 'actif');

				// Retirer l'ancienne vue
				screensCard.querySelector('.screens>li.actif').removeAttribute('class');
				
				// Afficher nouvelle vue
				screensCard.querySelector('.screens>li:nth-child('+parseInt(this.getAttribute('screen'))+')').setAttribute('class', 'actif');
			}
		}
	},

	// Fonction à l'envoi du formulaire de recherche simple
	simpleSearchSubmit : function(e) {
		var locality = document.querySelector('#locality').value;

		e.preventDefault();

		if(locality != '') {
			app.recupInformationsByAdress(locality, function(points) {
				// Remise à zéro des markers
				app.map.clearMarkers();

				for(var i=0; i<points.results.length; i++) {
					// Ajout du marker sur la carte
					app.map.addMarker({
						latitude: points.results[i].geometry.location.lat,
						longitude: points.results[i].geometry.location.lng,
						message: points.results[i].formatted_address
					});

					// Demande des arrêts à proximités de ce dernier marker
					socketWebServer.emit('request', 'stopsNearTo', [{
						latitude: points.results[i].geometry.location.lat,
						longitude: points.results[i].geometry.location.lng
					}, app.perimeter], function(err, stops) {
						if(err)
							console.log(err);
						else {
							if(stops) {
								for(var s in stops) {
									var lignes = '',
										beforeLigne = '';

									for(var l=0; l<stops[s].lignes.length; l++) {
										console.log(beforeLigne+' - '+stops[s].lignes[l].trip_headsign);
										if(beforeLigne != stops[s].lignes[l].trip_headsign) {
											beforeLigne = stops[s].lignes[l].trip_headsign;
											lignes += '<li>'+beforeLigne+'</li>';
											console.log('AJOUT : '+beforeLigne);
										}
									}

									app.map.addMarker({
										latitude: stops[s].arret.location[0],
										longitude: stops[s].arret.location[1],
										message: {
											id: stops[s].arret.stop_id,
											name: stops[s].arret.stop_name,
											content: '<strong>Lignes</strong><ul style="margin-top: 0">'+lignes+'</ul>'
										}
									});
								}
							}
							else
								alert('Aucun arrêts trouvé');
						}
						app.map.centerMarkers();
					});
				}
			});
		}
	},

	// Fonction à l'envoi du formulaire de recherche d'itinéraire
	routeSearchSubmit : function(e) {
		var nomDepart = document.querySelector('#nomDepart').value,
			nomArrive = document.querySelector('#nomArrive').value;

		e.preventDefault();

		app.recupInformationsByAdress(nomDepart, function(pointDepart) {
			app.recupInformationsByAdress(nomArrive, function(pointArrive) {
				// Suppression des markers sur la carte
				app.map.clearMarkers();

				// Ajout du marker du point de départ à la carte
				app.map.addMarker({
					latitude: pointDepart.results[0].geometry.location.lat,
					longitude: pointDepart.results[0].geometry.location.lng,
					message: pointDepart.results[0].formatted_address
				});

				// Ajout du marker du point d'arrivé à la carte
				app.map.addMarker({
					latitude: pointArrive.results[0].geometry.location.lat,
					longitude: pointArrive.results[0].geometry.location.lng,
					message: pointArrive.results[0].formatted_address
				});

				socketWebServer.emit("request", 'route', [[{
						latitude: pointDepart.results[0].geometry.location.lat,
						longitude: pointDepart.results[0].geometry.location.lng
					}, {
						latitude: pointArrive.results[0].geometry.location.lat,
						longitude: pointArrive.results[0].geometry.location.lng
					}], app.perimeter],
					function (err, d) {
						console.log(d);
				});
				// Centrage de la carte sur les markers
				app.map.centerMarkers();
			})
		});
	},

	// Fonction de suggestion automatique
	searchSuggest : function(e) {
		if(e.keyCode != 13) {
			var src = e.srcElement,
				value = src.value,
				parent = src.parentNode,
				suggestions = src.nextElementSibling;

			for(var i=0; i<suggestions.querySelectorAll('li').length; i++)
				suggestions.removeChild(suggestions.querySelectorAll('li')[i]);

			if(value.length > 4) {
				if(suggestions.getAttribute('class') == 'suggestions')
					suggestions.classList.add('actif')

				app.recupInformationsByAdress(value, function(response) {
					for(var i in response.results) {
						var li = document.createElement('li');
						li.innerHTML = response.results[i].formatted_address;
						li.onclick = function() {
							var value = this.innerHTML,
								parent = this.parentNode,
								input = parent.previousElementSibling,
								form = parent.parentNode;

							input.value = value;
							input.focus();
							suggestions.classList.remove('actif');
						};

						if(i==0)
							suggestions.appendChild(li);
						else
							suggestions.insertBefore(li, suggestions.firstChild);
					}
				});
			}
		}
	},

	// Récupération des résultats pour une adresse (Service Google)
	recupInformationsByAdress : function(lieu, callback) {
		var XMLHttp;

		if(window.XMLHttpRequest)
			XMLHttp = new XMLHttpRequest();
		else
			XMLHttp = new ActiveXObject("Microsoft.XMLHTTP");

		XMLHttp.onreadystatechange = function() {
			if(XMLHttp.readyState == 4) {
				if(XMLHttp.status == 200) {
					var reponse = JSON.parse(XMLHttp.responseText);

					if(callback) callback(reponse);
				}
			}
		}

		XMLHttp.open('GET', 
			'https://maps.googleapis.com/maps/api/geocode/json?address='+lieu,
			true);
		XMLHttp.send();
	}
};

