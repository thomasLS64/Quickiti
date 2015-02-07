var serveurGestionBD = require('socket.io-client')('http://localhost:7007');

// Création d'une nouvelle compagnie
console.log('Création de la première compagnie');
serveurGestionBD.emit('createAgency', {
	email : "test@test.com",
	password : "JeSuisUnMotDePasse",
	agency_id : "TST",
	agency_name : "Compagnie de test",
	agency_timezone : "Europe/Paris",
	agency_lang : "fr"
}, function(etat) {

	if(!etat)
		console.log('[ERREUR] Impossible de créer la première compagnie');
	else {
		// Et d'une autre...
		console.log('Création de la deuxième compagnie');
		serveurGestionBD.emit('createAgency', {
			email : "contact@agency.com",
			password : "BestPassW0rdEver",
			agency_id : "RTTP",
			agency_name : "Relational Tribute of Text Postal",
			agency_timezone : "America/Denver",
			agency_lang : "fr"
		}, function(etat) {

			if(!etat)
				console.log('[ERREUR] Impossible de créer la deuxième compagnie');
			else {
				// Mise à jour d'une compagnie
				console.log('Mise à jour de la première compagnie');
				serveurGestionBD.emit('updateAgency', {
					"email" : "test@test.com"
				},
				{
					"email" : "toto@tata.fr",
					"agency_name" : "Compagnie de toto"
				}, function(etat) {

					if(!etat)
						console.log('[ERREUR] Impossible de mettre à jour la première compagnie');
					else {
						// Récupération des informations d'une compagnie
						console.log('Sélection des compagnies');
						serveurGestionBD.emit('selectAgencies', {
							"agency_lang" : "fr"
						}, function(err, d) {
							// Création d'un arret
							console.log('Création d\'un arret');
							serveurGestionBD.emit('createStop', {
								stop_id : "F54",
								stop_name : "Arret de la Barre",
								stop_desc : "Plage de la Barre",
								location_type : 1,
								stop_lon : 40.32458464,
								stop_lat : 24.21574,
								compagnieId : d[0]["_id"]
							}, function(etat) {
								if(!etat)
									console.log('[ERREUR] Impossible de créer l\'arret');
								else {
									// Recherche des arrets
									console.log('Recherche des arrets');
									serveurGestionBD.emit('searchStopsNearTo', {
										latitude : 40.32458427,
										longitude : 24.21574
									}, 25, function(err, d) {
										if(!err)
											console.log(d);
										else
											console.log(err);
									});
								}
							});
						});
					}
				});
			}
		});
	}
});
