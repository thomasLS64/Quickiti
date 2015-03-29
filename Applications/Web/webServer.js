var express = require('express'),
	clientSockIo= require('socket.io-client'),
	app = express(),
	color = require('colors'),
	server = require('http').createServer(app),
	io = require('socket.io')(server),
	request = require('request'),
	expressValidator = require('validator'),
	port = 8080;
/*
 Client vers le serveur central
*/


clientServeurCentral = clientSockIo('http://localhost:8008/', {
	reconnection : 			true,  //Reconnexion automatique
	reconnectionDelay : 	2000,  //Reconnexion toutes les 2 secondes
	reconnectionDelayMax : 	100000 //Temps maximum passé à essayer de se reconnecter
});

/*
 Evenement déclanché quand on est connecté au serveur central
 */

clientServeurCentral.on('connect', function(){
	console.info("[Serveur Central] ".magenta + "Connecté au serveur central.".green);
	clientServeurCentral.connecte = true; //Variable qui indique l'état de la connexion au serveur
});

/*
 Evenement déclanché quand on est déconnecté du serveur central
 */

clientServeurCentral.on('disconnect', function(){
	console.error("[Serveur Central] ".purple + "Déconnecté du serveur central.".red);
	clientServeurCentral.connecte = false;
});

/*
 Evenement déclanché quand on tente de se reconnecter au serveur central
 */

clientServeurCentral.on('reconnecting', function(n) {
	console.info("[Serveur Central] ".magenta + "Reconnexion en cours (".yellow + n + ") ...".yellow);
});

/*
 Evenement déclanché quand une tentative de reconnexion au serveur central a échoué
 */

clientServeurCentral.on('reconnect_error', function() {
	console.error("[Serveur Central] ".magenta + "Reconnexion échouée".red);
});

/*
 Evenement déclanché quand on a atteind la limite de temps passé à essayer de se reconnecter au serveur central
 */

clientServeurCentral.on('reconnect_failed', function() {
	console.error("[Serveur Central] ".magenta + "Reconnexion impossible.".red);
});

server.listen(port, function() {
	console.log('Le serveur web écoute sur le port %d', port);
});

// Dossier contenant l'application web
app.use(express.static(__dirname + '/public'))
	.get('/inscription/', function (req, res) {
		res.render('pages/inscription.ejs');
	})
	.get('/espaceMembre/', function () {

	});
// Serveur de socket de l'application web
io.on('connection', function(socket) {
	console.log('Nouveau client');
	socket.on('request', function(requestType, request, callback) {
		console.log('Requête client');
		clientServeurCentral.emit('clientRequest', requestType, request, callback);
		console.log("[Serveur Central]".magenta + " Envoi d'une requête de type " + requestType + " ...");
	});
	socket.on('inscription', function (form, callback) {
		console.log("Inscription en cours...");
		callback("Validation du formulaire en cours...");
		//Variable qui sera mis à false si une erreur est detecté dans le formulaire
		var formOk = true;
		//Objet qui contiendra le formulaire avec chaque informations protégées
		//Contre un éventuel XSS
		var formProtege = {};
		//Tableaux qui contiendra les erreurs si on en trouve, il
		//sera utilisé pour les afficher à l'utilisateur
		var formErrors = [];

		if (typeof form.infoGenerales != "undefined") {
			formProtege.infoGenerales = {};
			if (typeof form.infoGenerales.adresse != "undefined") {
				if (form.infoGenerales.adresse.length < 3 || form.infoGenerales.adresse.length > 30) {

				}
			}
		}
		else {
			formOk = false;
		}
		if (typeof form.gtfs != "undefined") {

		}
		else {
			formOk = false;
		}
		callback("Envoi au serveur central...");
		clientServeurCentral.emit('agencySubscribe', form);
	});
	socket.on('chercheCPVille', function (codePostal, pays, callback) {
		request('http://api.zippopotam.us/' + pays.toLowerCase() + '/' + codePostal, function (error, response, body) {
			if (!error) {
				callback(JSON.parse(body));
			}
		});
	});
});
