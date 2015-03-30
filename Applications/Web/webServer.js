var express = require('express'),
	clientSockIo= require('socket.io-client'),
	app = express(),
	color = require('colors'),
	server = require('http').createServer(app),
	io = require('socket.io')(server),
	request = require('request'),
	cookieParser = require('cookie-parser'),
	session = require('cookie-session'),
	bodyParser = require('body-parser'),
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
	console.info("[Serveur BD] ".magenta + "Connecté au serveur de gestion de base de donnée.".green);
	clientServeurCentral.connecte = true; //Variable qui indique l'état de la connexion au serveur
});

/*
 Evenement déclanché quand on est déconnecté du serveur de gestion de bd
 */
clientServeurCentral.on('disconnect', function(){
	console.error("[Serveur BD] ".magenta + "Déconnecté du serveur central.".red);
	clientServeurCentral.connecte = false;
});

/*
 Evenement déclanché quand on tente de se reconnecter au serveur de gestion de bd
 */
clientServeurCentral.on('reconnecting', function(n) {
	console.info("[Serveur BD] ".magenta + "Reconnexion en cours (".yellow + n + ") ...".yellow);
});

/*
 Evenement déclanché quand une tentative de reconnexion au serveur de gestion de bd a échoué
 */
clientServeurCentral.on('reconnect_error', function() {
	console.error("[Serveur BD]" + " Reconnexion échouée\n");
});

/*
 Evenement déclanché quand on a atteind la limite de temps passé à essayer de se reconnecter au serveur de gestion de bd
 */
clientServeurCentral.on('reconnect_failed', function() {
	console.error("[Serveur BD] Reconnexion au serveur de gestion de bd impossible.");
});
clientServeurCentral.on('retourUtilisateur', function (mess, type, sockID) {
	socketsWeb[sockID].emit('retourUtilisateur', mess, type);
});


server.listen(port, function() {
	console.log('[Serveur Web]'.cyan + ' Le serveur web écoute sur le port %d', port);
});
app.use(cookieParser());
app.use(session({secret: 'QUICKITI987',  saveUninitialized: true}));
app.use(bodyParser());
//Middleware
function requireLogin (req, res, next) {
	if (req.session.agency) {
		// User is authenticated, let him in
		next();
	} else {
		// Otherwise, we redirect him to login form
		res.redirect("/connexion");
	}
}
function requireNotLogged (req, res, next) {
	console.log(req.session.agency);
	if (!req.session.agency) {
		// User isn't authenticated, let him in
		next();
	} else {
		// Otherwise, we redirect him to member space
		res.redirect("/espaceMembre");
	}
}
// Dossier contenant l'application web
app.use(express.static(__dirname + '/public'))
	.get('/inscription',[requireNotLogged], function (req, res) {
		res.render('pages/inscription.ejs', { pageTitle: "Inscription", pageHeader: "Inscription à Quickiti", tabAct: "insc", agency: null });
	})
	.get('/connexion', [requireNotLogged], function (req, res) {
		res.render('pages/connexion.ejs', { pageTitle: "Connexion", pageHeader: "Connexion à Quickiti", tabAct: "conn", agency: null });
	})
	.post('/connexion', function (req, res) {
		if (req.body.emailConnexion != null && req.body.passConnexion != null) {
			clientServeurGestBD.emit("loginAgency",
				req.body.emailConnexion,
				req.body.passConnexion,
				function (logged, agency) {
					if (logged) {
						console.log(agency);
						req.session.agency = agency;
						res.redirect('/espaceMembre');
					} else {
						res.render('pages/connexion.ejs', {
							pageTitle: "Connexion",
							pageHeader: "Connexion à Quickiti",
							tabAct: "conn",
							erreur: "Vos identifiants ne sont pas valides.",
							agency: null
						});
					}
				}
			);
		}
		else {
			res.render('pages/connexion.ejs', {
				pageTitle: "Connexion",
				pageHeader: "Connexion à Quickiti",
				tabAct: "conn",
				erreur: "Vos identifiants ne sont pas renseignés."
			});
		}
	})
	.get('/espaceMembre', [requireLogin], function (req, res) {
		res.render('pages/espaceMembre.ejs', { pageTitle: "Espace membre", pageHeader: "Espace membre", tabAct: "espmbr", agency: req.session.agency });
	})
	.get('/deconnexion', [requireLogin], function(req, res) {
		req.session = null;
		res.redirect('/connexion');
	})
;
// Serveur de socket de l'application web

io.on('connection', function(socket) {
	console.log('[Serveur Web]'.cyan +' Nouveau client');
	socket.on('request', function(requestType, request, callback) {
		console.log('Requête client');
		clientServeurCentral.emit('clientRequest', requestType, request, callback);
		console.log("[Serveur BD]".magenta + "< Envoi d'une requête de type " + requestType + " ...");
	});
	socket.on('inscription', function (form, callback) {
		console.log("Inscription en cours...");
		socket.emit("retourUtilisateur", "Validation du formulaire en cours...", "info");
		//Tableaux qui contiendra les erreurs si on en trouve, il
		//sera utilisé pour les afficher à l'utilisateur
		var formErrors = [];

		if (typeof form.infoGenerales != "undefined") {
			/*
			 	Validation de l'adresse
			*/
			if (typeof form.infoGenerales.adresse != "undefined") {

				if (!validator.isLength(form.infoGenerales.adresse, 3, 60)) {
					formErrors.push("L'adresse est incorrect.");
				}
				else {
					form.infoGenerales.adresse =
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
			if (typeof form.infoGenerales.raisSocial != "undefined" && validator.isLength(form.infoGenerales.raisSocial, 3, 60)) {
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
			if (typeof form.infoGenerales.codePostal == "undefined" || form.infoGenerales.codePostal.length > 6) {
				formErrors.push("Le code postal n'est pas définie, ou est incorrect.");
			}
			/*
			 	Validation de la ville
			*/
			if (typeof form.infoGenerales.ville != "undefined" && form.infoGenerales.ville.length < 60) {
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
			/*
			 Validation du site web
			 */
			if (typeof form.infoGenerales.urlSiteWeb == "undefined" || !validator.isURL(form.infoGenerales.urlSiteWeb)) {
				formErrors.push("L'url du site web n'est pas définie, ou est incorrect.");
			}
			/*
			 Validation du téléphone
			 */
			if (typeof form.infoGenerales.telephone == "undefined" || !validator.matches(form.infoGenerales.telephone, '^\\+?[0-9]{9,11}$')) {
				formErrors.push("Le numéro de téléphone n'est pas définie, ou est incorrect.");
			}
		}
		else {
			formErrors.push("Les informations générales ne sont pas définies.");
		}
		if (typeof form.gtfs != "undefined") {
			if (typeof form.gtfs.zipGTFS == "undefined" || !validator.isURL(form.gtfs.zipGTFS)) {
				formErrors.push("L'adresse du fichier GTFS est incorrect ou non définie.")
			}
			if (typeof form.gtfs.BoolUseRealTime != "undefined" && form.gtfs.BoolUseRealTime) {
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
				form.gtfs.addrGTFSVehiclePosition = "";
				form.gtfs.addrGTFSTripUpdate = "";
				form.gtfs.addrGTFSAlert = "";
				form.gtfs.BoolUseRealTime = false;
			}
		}
		else {
			formErrors.push("Les informations GTFS ne sont pas définies.");
		}
		if (formErrors.length == 0) {
			socket.emit("retourUtilisateur", "Formulaire validé, envoi au serveur de gestion de bd...", 'info');
			clientServeurGestBD.emit('createAgency', form, callback);
		}
		else {
			socket.emit("retourUtilisateur", formErrors, "danger");
			console.log("Formulaire invalide.");
			callback();
		}
	});
	socket.on('chercheCPVille', function (codePostal, pays, callback) {
		request('http://api.zippopotam.us/' + pays.toLowerCase() + '/' + codePostal, function (error, response, body) {
			if (!error) {
				callback(JSON.parse(body));
			}
		});
	});
	socket.on("updateGTFS", function (idAgency, callback) {
		clientServeurRecupDonnee = clientSockIo('http://localhost:9009/').emit('updateGTFS', idAgency, callback);


	});
});
