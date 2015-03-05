window.onload = function() {
	/*
	 * Initialisation des variables
	 */
	var screensCards = document.querySelectorAll('.screens-card'),
		formSimpleSearch = document.querySelector('#simpleSearch'),
		formRoutesSearch = document.querySelector('#routesSearch'),
		markers = new L.FeatureGroup();

	/*
	 * Traitements
	 */
	// Navigation dans les différentes screens-cards
	for(var i=0; i<screensCards.length; i++) {
		var screensCard = screensCards[i],
			links = screensCard.querySelectorAll('.nav-screens>li'),
			screens = screensCard.querySelectorAll('.screens>li');

		for(var k=0; k<links.length; k++) {
			links[k].onclick = function() {
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
	}


	// Traitement de la recherche simple
	formSimpleSearch.onsubmit = function(e) {
		var locality = document.querySelector('#locality').value;

		e.preventDefault();

		recupInformationsByAdress(locality, function(point) {
			var center = {lat: 0, lng: 0},
				nbResults = point.results.length;

			// Suppression des markers sur la carte
			markers.clearLayers();

			// Ajout des nouveaux marker dans la listes des markers
			for(var i=0; i<nbResults; i++) {
				var location = point.results[i].geometry.location,
					address = point.results[i].formatted_address;

				center.lat += location.lat;
				center.lng += location.lng;

				markers.addLayer(L.marker(location).bindPopup('<strong>'+address+'</strong>').openPopup());
			}

			// Ajout des markers sur la map
			map.addLayer(markers);

			// Centrage de la carte sur le marker
			map.fitBounds(markers.getBounds());
		});
	}

	formSimpleSearch.onkeyup = function(e) {
		suggestSearch(e);
	};

	// Traitement de la recherche d'itinéraire
	formRoutesSearch.onsubmit = function(e) {
		// Variables
		var nomDepart = document.querySelector('#nomDepart').value,
			nomArrive = document.querySelector('#nomArrive').value;

		// Annuler comportement par défaut
		e.preventDefault();

		recupInformationsByAdress(nomDepart, function(pointDepart) {
			recupInformationsByAdress(nomArrive, function(pointArrive) {

				var center = {lat: 0, lng: 0},
					nbResults = [pointDepart.results.length, pointArrive.results.length];

				// Suppression des markers sur la carte
				markers.clearLayers();

				// Ajout des markers du point de départ dans la listes des markers
				for(var i=0; i<nbResults[0]; i++) {
					var location = pointDepart.results[i].geometry.location,
						address = pointDepart.results[i].formatted_address;

					center.lat += location.lat;
					center.lng += location.lng;

					markers.addLayer(L.marker(location).bindPopup('<strong>'+address+'</strong>').openPopup());
				}

				// Ajout des markers du point d'arrivé dans la listes des markers
				for(var i=0; i<nbResults[1]; i++) {
					var location = pointArrive.results[i].geometry.location,
						address = pointArrive.results[i].formatted_address;

					center.lat += location.lat;
					center.lng += location.lng;

					markers.addLayer(L.marker(location).bindPopup('<strong>'+address+'</strong>').openPopup());
				}

				// Ajout des markers sur la map
				map.addLayer(markers);

				// Centrage de la carte sur le marker
				map.fitBounds(markers.getBounds());
			})
		});

	}

	formRoutesSearch.onkeyup = function(e) {
		suggestSearch(e);
	};

	var recupInformationsByAdress = function(lieu, callback) {
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

	var suggestSearch = function(event) {
		var src = event.srcElement,
			value = src.value,
			parent = src.parentNode,
			suggestions = src.nextElementSibling;

		for(var i=0; i<suggestions.querySelectorAll('li').length; i++)
			suggestions.removeChild(suggestions.querySelectorAll('li')[i]);

		if(value.length > 4) {
			if(suggestions.getAttribute('class') == 'suggestions')
				suggestions.classList.add('actif')

			recupInformationsByAdress(value, function(response) {
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
						//form.submit();
					};

					suggestions.appendChild(li);
				}
			});
		}
	};
}