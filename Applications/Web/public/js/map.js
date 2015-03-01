// Création de l'objet map avec Leaflet
map = L.map('map', {
	center: [43.4736245, -1.4984441],	// Centrage de la carte sur Anglet
	zoom: 17,							// Niveau de zoom initial
	zoomControl: false,					// Controle du zoom avec les boutons leaflet
	attributionControl: false			// Affichage des attributions sur la map
});

// Ajout du layer de MapQuest à notre map
L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg', {
	subdomains: '1234' // Sous-domaines utilisés pour la récupération des images de la map (par défaut "abcd")
}).addTo(map);