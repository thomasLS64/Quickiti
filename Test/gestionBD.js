var serveurGestionBD = require('socket.io-client')('http://localhost:7007');

// Création d'une nouvelle compagnie
serveurGestionBD.emit('createAgency', {
	email : "test@test.com",
	password : "JeSuisUnMotDePasse",
	agency_id : "TST",
	agency_name : "Compagnie de test",
	agency_timezone : "Europe/Paris",
	agency_lang : "fr"
});

// Et d'une autre...
serveurGestionBD.emit('createAgency', {
	email : "contact@agency.com",
	password : "BestPassW0rdEver",
	agency_id : "RTTP",
	agency_name : "Relational Tribute of Text Postal",
	agency_timezone : "America/Denver",
	agency_lang : "fr"
});



// Mise à jour d'une compagnie
serveurGestionBD.emit('updateAgency',{
	"email" : "test@test.com"
},
{
	"email" : "toto@tata.fr",
	"agency_name" : "Compagnie de toto"
});


// Récupération des informations d'une compagnie
serveurGestionBD.emit('selectAgency', {
	"agency_lang" : "fr"
}, function(err, d) {
	if(err) throw err;
	console.log(d);
});
