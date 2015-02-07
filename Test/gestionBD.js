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
							console.log(d);
						});
					}
				});
			}
		});
	}

});
