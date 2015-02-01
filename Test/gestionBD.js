var serveurGestionBD = require('socket.io-client')('http://localhost:7007');

/*
// Création d'une nouvelle compagnie
serveurGestionBD.emit('createAgency', {
	email : "test@test.com",
	password : "JeSuisUnMotDePasse",
	agency_id : "TST",
	agency_name : "Compagnie de test",
	agency_timezone : "Europe/Paris",
	agency_lang : "fr"
});
*/

/*
// Mise à jour d'une compagnie
serveurGestionBD.emit('updateAgency',{
	"email" : "beurk2@toto.com"
},
{
	"email" : "test@test.com"
});
*/

/*
// Récupération des informations d'une compagnie
serveurGestionBD.emit('selectAgency', {
	"email" : "test@test.com"
}, function(err, d) {
	console.log(d);
});
*/