var serveurRecupDonnee = require('../Serveurs/node_modules/socket.io-client')('http://localhost:9009');

// Création d'une nouvelle compagnie
console.log('Création de la première compagnie');
serveurRecupDonnee.emit('agencySubscribe', {
	email : "test@test.com",
	password : "JeSuisUnMotDePasse",
	name: "ChronoMoins",
	zipCode: 84848,
	urlGTFS: "../Test/Test.zip",
	urlSIRI: "",
	adress: "3 Rue des abricots",
}, function(etat) {
		console.log(etat);
});
