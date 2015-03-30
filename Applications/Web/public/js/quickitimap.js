function QuickitiMap(DOMelt) {
	this.markers = new L.FeatureGroup();
	this.map = L.map(DOMelt, {
		center: [43.4736245, -1.4984441],	// Centrage de la carte sur Anglet
		zoom: 17,							// Niveau de zoom initial
		zoomControl: false,					// Controle du zoom avec les boutons leaflet
		attributionControl: false			// Affichage des attributions sur la map
	});
	
	return this;
}

QuickitiMap.prototype = {
	geolocate : function(callback) {
		if(callback) {
			if(typeof(navigator.geolocation) == "undefined")
				callback("Your browser don't support geolocation.", null);
			else {
				navigator.geolocation.getCurrentPosition(function(pos) {
					callback(null, pos);
				}, function(error) {
					switch(error.code) {
						case error.PERMISSION_DENIED:
							callback("User denied the request for Geolocation.", null);
							break;
						case error.POSITION_UNAVAILABLE:
							callback("Location information is unavailable.", null);
							break;
						case error.TIMEOUT:
							callback("The request to get user location timed out.", null);
							break;
						case error.UNKNOWN_ERROR:
							callback("An unknown error occurred.", null);
							break;
					}
				});
			}
		}
		return this;
	},
	
	initialize : function() {
		// Ajout du layer de MapQuest à notre map
		L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg', {
			subdomains: '1234' // Sous-domaines utilisés pour la récupération des images de la map (par défaut "abcd")
		}).addTo(this.map);

		return this;
	},
	
	addMarker : function(marker) {
		this.map.addLayer(
			this.markers.addLayer(
				L.marker(
					[marker.latitude, marker.longitude]
				).bindPopup(
					marker.message
				).openPopup()
			)
		);
		return this;
	},
	
	clearMarkers : function() {
		this.markers.clearLayers();
		return this;
	},
	
	centerMarkers : function() {
		this.map.fitBounds(this.markers.getBounds());
		return this;
	}
};