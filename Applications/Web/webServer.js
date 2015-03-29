var express = require('express'),
	clientSockIo= require('socket.io-client'),
	app = express(),
	color = require('colors'),
	server = require('http').createServer(app),
	io = require('socket.io')(server),
	request = require('request'),
	validator = require('validator'),
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
	console.error("[Serveur Central] ".magenta + "Déconnecté du serveur central.".red);
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
	console.error("[Serveur Central]" + " Reconnexion échouée\n");
});

/*
 Evenement déclanché quand on a atteind la limite de temps passé à essayer de se reconnecter au serveur central
 */

clientServeurCentral.on('reconnect_failed', function() {
	console.error("[Serveur Central] Reconnexion au serveur central impossible.");
});

server.listen(port, function() {
	console.log('[Serveur Web]'.cyan + ' Le serveur web écoute sur le port %d', port);
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
	console.log('[Serveur Web]'.cyan +' Nouveau client');
	socket.on('request', function(requestType, request, callback) {
		console.log('Requête client');
		clientServeurCentral.emit('clientRequest', requestType, request, callback);
		console.log("[Serveur Central]".magenta + "< Envoi d'une requête de type " + requestType + " ...");
	});
	socket.on('inscription', function (form, callback) {
		console.log("Inscription en cours...");

		callback("Validation du formulaire en cours...");
		console.log(callback);
		callback("to");
		//Tableaux qui contiendra les erreurs si on en trouve, il
		//sera utilisé pour les afficher à l'utilisateur
		var formErrors = [];

		if (typeof form.infoGenerales != "undefined") {
			/*
			 	Validation de l'adresse
			*/
			if (typeof form.infoGenerales.adresse != "undefined") {

				if (form.infoGenerales.adresse.length < 3 || form.infoGenerales.adresse.length > 30) {
					formErrors.push("L'adresse est incorrect.");
				}
				else {
					formProtege.infoGenerales.adresse =
						validator.stripLow( //On retire les caractère avec un code numérique < 32 et > 127 (caractères de controles)
							validator.escape( //On échappe les caractères de balisages en HTML (< > & " ')
								form.infoGenerales.adresse
							)
						);
				}
			}
			else {
				formErrors.push("L'adresse n'est pas définie")
			}
			/*
				Validation de la raison social
			 */
			if (typeof form.infoGenerales.raisSocial != "undefined" && (form.infoGenerales.raisSocial.length > 3 && form.infoGenerales.raisSocial.length < 30)) {
				form.infoGenerales.raisSocial =
					validator.stripLow( //On retire les caractère avec un code numérique < 32 et > 127 (caractères de controles)
						validator.escape( //On échappe les caractères de balisages en HTML (< > & " ')
							form.infoGenerales.raisSocial
						)
					);
			}
			else {
				formErrors.push("La raison social n'est pas définie, ou est incorrect.");
			}
			/*
				Validation de l'email de contact
			*/
			if (typeof form.infoGenerales.email == "undefined" || !validator.isEmail(form.infoGenerales.email)) {
				formErrors.push("L'email de contact n'est pas définie, ou est incorrect.");
			}
			/*
			 	Validation du mot de passe
			*/
			if (typeof form.infoGenerales.motDePasse == "undefined") {
				formErrors.push("Le mot de passe n'est pas définie, ou est incorrect.");
			}
			/*
			 	Validation du pays
			*/
			if (typeof form.infoGenerales.pays == "undefined" || form.infoGenerales.pays.length != 2 || !validator.isAlpha(form.infoGenerales.pays)) {
				formErrors.push("Le pays n'est pas définie, ou est incorrect.");
			}
			/*
			 	Validation du code postal
			*/
			if (typeof form.infoGenerales.codePostal == "undefined" || form.infoGenerales.codePostal.length > 6 || !validator.isNumeric(form.infoGenerales.codePostal)) {
				formErrors.push("Le code postal n'est pas définie, ou est incorrect.");
			}
			/*
			 	Validation de la ville
			*/
			if (typeof form.infoGenerales.ville != "undefined" && form.infoGenerales.ville.length < 20) {
				form.infoGenerales.ville =
					validator.stripLow( //On retire les caractère avec un code numérique < 32 et > 127 (caractères de controles)
						validator.escape( //On échappe les caractères de balisages en HTML (< > & " ')
							form.infoGenerales.ville
						)
					);
			}
			else {
				formErrors.push("La ville n'est pas définie, ou est incorrect.");
			}
		}
		else {
			formErrors.push("Les informations générales ne sont pas définies.");
		}
		if (typeof form.gtfs != "undefined") {
			if (typeof form.gtfs.zipGTFS == "undefined" || !validator.isURL(form.gtfs.zipGTFS)) {
				formErrors.push("L'adresse du fichier GTFS est incorrect ou non définie.")
			}
			if (typeof form.gtfs.addrGTFSAlert == "undefined" || !validator.isURL(form.gtfs.addrGTFSAlert)) {
				formErrors.push("L'adresse du fichier GTFSRealtime Alert est incorrect ou non définie.")
			}
			if (typeof form.gtfs.addrGTFSTripUpdate == "undefined" || !validator.isURL(form.gtfs.addrGTFSTripUpdate)) {
				formErrors.push("L'adresse du fichier GTFSRealtime Trip Update est incorrect ou non définie.")
			}
			if (typeof form.gtfs.addrGTFSVehiclePosition == "undefined" || !validator.isURL(form.gtfs.addrGTFSVehiclePosition)) {
				formErrors.push("L'adresse du fichier GTFSRealtime Vehicle Position est incorrect ou non définie.")
			}
		}
		else {
			formErrors.push("Les informations GTFS ne sont pas définies.");
		}
		if (formErrors.length == 0) {
			callback("Formulaire validé, envoi au serveur central...");
			clientServeurCentral.emit('agencySubscribe', form, callback);
		}
		else {
			callback(formErrors);
			console.log("Formulaire invalide.");

		}
	});
	socket.on('chercheCPVille', function (codePostal, pays, callback) {
		request('http://api.zippopotam.us/' + pays.toLowerCase() + '/' + codePostal, function (error, response, body) {
			if (!error) {
				callback(JSON.parse(body));
			}
		});
	});
});
