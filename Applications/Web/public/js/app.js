var app = {
	// Fonction d'initialisation de l'application
	initialize : function() {
		// Création de la carte
		this.map = new QuickitiMap('map').initialize();
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

		app.recupInformationsByAdress(locality, function(points) {
			// Remise à zéro des markers
			app.map.clearMarkers();

			// Ajout des nouveaux marker dans la listes des markers
			for(var i=0; i<points.results.length; i++) {
				app.map.addMarker({
					latitude: points.results[i].geometry.location.lat,
					longitude: points.results[i].geometry.location.lng,
					message: points.results[i].formatted_address
				});
			}

			// Centrage de la carte sur le marker
			app.map.centerMarkers();
		});
	},

	// Fonction à l'envoi du formulaire de recherche d'itinéraire
	routeSearchSubmit : function(e) {
		var nomDepart = document.querySelector('#nomDepart').value,
			nomArrive = document.querySelector('#nomArrive').value;

		e.preventDefault();

		app.recupInformationsByAdress(nomDepart, function(pointDepart) {
			app.recupInformationsByAdress(nomArrive, function(pointArrive) {
				var nbResults = [pointDepart.results.length, pointArrive.results.length];

				// Suppression des markers sur la carte
				app.map.clearMarkers();

				// Ajout des markers du point de départ à la carte
				for(var i=0; i<nbResults[0]; i++) {
					app.map.addMarker({
						latitude: pointDepart.results[i].geometry.location.lat,
						longitude: pointDepart.results[i].geometry.location.lng,
						message: pointDepart.results[i].formatted_address
					});
				}

				// Ajout des markers du point d'arrivé à la carte
				for(var i=0; i<nbResults[1]; i++) {
					app.map.addMarker({
						latitude: pointArrive.results[i].geometry.location.lat,
						longitude: pointArrive.results[i].geometry.location.lng,
						message: pointArrive.results[i].formatted_address
					});
				}

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

						suggestions.appendChild(li);
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

