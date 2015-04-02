//On place le repertoire de travail dans le repertoire où se situe le fichier
process.chdir(__dirname);
//On définie toutes les dépendances, et on lance l'écoute du serveur web
var express = require('express'),
	clientSockIo = require('socket.io-client'),
	app = express(),
	color = require('colors'),
	server = require('http').createServer(app),
	io = require('socket.io')(server),
	request = require('request'),
	cookieParser = require('cookie-parser'),
	session = require('cookie-session'),
	bodyParser = require('body-parser'),
	validator = require('validator'),
	async = require('async'),
	jetonsConnexionAuto = {},
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
	console.info("[Serveur Central]" + " Connecté au serveur central.".green);
	clientServeurCentral.connecte = true; //Variable qui indique l'état de la connexion au serveur
});

/*
 Evenement déclanché quand on est déconnecté du serveur de gestion de bd
 */
clientServeurCentral.on('disconnect', function(){
	console.error("[Serveur Central] Déconnecté du serveur central.");
	clientServeurCentral.connecte = false;
});

/*
 Evenement déclanché quand on tente de se reconnecter au serveur de gestion de bd
 */
clientServeurCentral.on('reconnecting', function(n) {
	console.info("[Serveur Central] Reconnexion en cours (".yellow + n + ") ...".yellow);
});

/*
 Evenement déclanché quand une tentative de reconnexion au serveur de gestion de bd a échoué
 */
clientServeurCentral.on('reconnect_error', function() {
	console.error("[Serveur Central]" + " Reconnexion échouée\n");
});

/*
 Evenement déclanché quand on a atteind la limite de temps passé à essayer de se reconnecter au serveur de gestion de bd
 */
clientServeurCentral.on('reconnect_failed', function() {
	console.error("[Serveur Central] Reconnexion au serveur central.");
});
clientServeurCentral.on('retourUtilisateur', function (mess, type, sockID) {
	socketsWeb[sockID].emit('retourUtilisateur', mess, type);
});

/*
 Client vers le serveur central
*/
clientServeurGestBD = clientSockIo('http://localhost:7007/', {
	reconnection : 			true,  //Reconnexion automatique
	reconnectionDelay : 	2000,  //Reconnexion toutes les 2 secondes
	reconnectionDelayMax : 	100000 //Temps maximum passé à essayer de se reconnecter
});

/*
 Evenement déclanché quand on est connecté au serveur central
 */
clientServeurGestBD.on('connect', function(){
	console.info("[Serveur BD] ".magenta + "Connecté au serveur de gestion de base de donnée.".green);
	clientServeurGestBD.connecte = true; //Variable qui indique l'état de la connexion au serveur
});

/*
 Evenement déclanché quand on est déconnecté du serveur de gestion de bd
 */
clientServeurGestBD.on('disconnect', function(){
	console.error("[Serveur BD] ".magenta + "Déconnecté du serveur de gestion de base de donnée.".red);
	clientServeurGestBD.connecte = false;
});

/*
 Evenement déclanché quand on tente de se reconnecter au serveur de gestion de bd
 */
clientServeurGestBD.on('reconnecting', function(n) {
	console.info("[Serveur BD] ".magenta + "Reconnexion en cours (".yellow + n + ") ...".yellow);
});

/*
 Evenement déclanché quand une tentative de reconnexion au serveur de gestion de bd a échoué
 */
clientServeurGestBD.on('reconnect_error', function() {
	console.error("[Serveur BD]" + " Reconnexion échouée\n");
});

/*
 Evenement déclanché quand on a atteind la limite de temps passé à essayer de se reconnecter au serveur de gestion de bd
 */
clientServeurGestBD.on('reconnect_failed', function() {
	console.error("[Serveur BD] Reconnexion au serveur de gestion de bd impossible.");
});
clientServeurGestBD.on('retourUtilisateur', function (mess, type, sockID) {
	socketsWeb[sockID].emit('retourUtilisateur', mess, type);
});


server.listen(port, function() {
	console.log('[Serveur Web]'.cyan + ' Le serveur web écoute sur le port %d'.green, port);
});
app.use(cookieParser());
app.use(session({secret: 'QUICKITI987',  saveUninitialized: true}));
app.use(bodyParser.urlencoded({
	extended: true
}));
//Middleware
function requireLogin (req, res, next) {
	if (req.session.agency) {
		clientServeurGestBD.emit('selectAgencies', { _id: req.session.agency._id }, function (err, agencys) {
			if (!err) {
				req.session.agency = agencys[0];
				next();
			}
			else {
				res.send('Erreur : La récupération de l\'agence a échouée.');
			}
		});
	} else {
		if (jetonsConnexionAuto[req.query.jeton]) {
			clientServeurGestBD.emit('selectAgencies', { _id: jetonsConnexionAuto[req.query.jeton]._id }, function (err, agencys) {
				if (!err) {
					req.session.agency = agencys[0];
					next();
				}
				else {
					res.send('Erreur : La récupération de l\'inscription n\'a pas pu être retrouvée.');
				}
				delete jetonsConnexionAuto[req.query.jeton];
			});
		}
		else {
			// Sinon on redirige vers le formulaire de login
			res.redirect("/connexion");
		}
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
	.post('/connexion', [requireNotLogged], function (req, res) {
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
		var nbrArret, nbrLigne, nbrArretLigne;
		async.waterfall([
				function (compteArretTermine) {
					clientServeurGestBD.emit('selectStops',
						{ compagnieId: req.session.agency._id },
						compteArretTermine
					);
				},
				function (arrets, compteLignesTermine) {
					nbrArret = arrets.length;
					clientServeurGestBD.emit('selectLines',
						{ compagnieId: req.session.agency._id },
						compteLignesTermine
					);
				},
				function (lignes, compteArretLignesTermine) {
					nbrLigne = lignes.length;
					clientServeurGestBD.emit(
						'selectStopsLines',
						{ compagnieId: req.session.agency._id },
						compteArretLignesTermine
					);
				}
			],
			function (err, arretsLignes) {
				nbrArretLigne = arretsLignes.length;
				res.render('pages/espaceMembre.ejs',
					{
						pageTitle: "Espace membre",
						pageHeader: "Espace membre",
						tabAct: "espmbr",
						agency: req.session.agency,
						nbrArret: nbrArret,
						nbrLigne: nbrLigne,
						nbrArretLigne: nbrArretLigne
					}
				);
			}
		);

	})
	.get('/modifier', [requireLogin], function (req, res) {
		res.render('pages/modification.ejs',
			{
				pageTitle: "Espace membre - Modifier ses informations",
				pageHeader: "Modifier ses informations",
				tabAct: "espmbr",
				agency: req.session.agency
			}
		);
	})
	.get('/deconnexion', [requireLogin], function(req, res) {
		req.session = null;
		res.redirect('/connexion');
	})
	.get('/desinscription', [requireLogin], function(req, res) {
		clientServeurGestBD.emit('unsubscribeAgency', req.session.agency._id, function (err) {
			if (!err) {
				req.session = null;
				res.redirect('/inscription');
			}
			else {
				res.send('Erreur : La désinscription de l\'agence a échouée.');
			}
		});

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

	socket.on('subscribeAgency', function (form, callback) {
		console.log("Inscription d'une compagnie...");
		socket.emit("userCallback", "Validation du formulaire en cours...", "info");
		var formErrors = [];
		if (typeof form.gtfs != "undefined") {
			if (typeof form.gtfs.zipGTFS == "undefined" || !validator.isURL(form.gtfs.zipGTFS)) {
				formErrors.push("L'adresse du fichier GTFS est incorrect ou non définie.");
			}
			if (typeof form.gtfs.BoolUseRealTime != "undefined" && form.gtfs.BoolUseRealTime) {
				if (typeof form.gtfs.addrGTFSAlert == "undefined" || !validator.isURL(form.gtfs.addrGTFSAlert)) {
					formErrors.push("L'adresse du fichier GTFSRealtime Alert est incorrect ou non définie.");
				}
				if (typeof form.gtfs.addrGTFSTripUpdate == "undefined" || !validator.isURL(form.gtfs.addrGTFSTripUpdate)) {
					formErrors.push("L'adresse du fichier GTFSRealtime Trip Update est incorrect ou non définie.");
				}
				if (typeof form.gtfs.addrGTFSVehiclePosition == "undefined" || !validator.isURL(form.gtfs.addrGTFSVehiclePosition)) {
					formErrors.push("L'adresse du fichier GTFSRealtime Vehicle Position est incorrect ou non définie.");
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
			formErrors.push("Les URLs des fichiers GTFS ne sont pas définies.");
		}
		if (formErrors.length != 0) {
			socket.emit("userCallback", formErrors, "danger");
			console.log("Formulaire invalide.");
			callback();
		}
		else {
			socket.emit("userCallback", "Formulaire validé, enregistrement de l'entreprise...", "info");
			var formValide = {
				gtfs: {
					zipGTFS: form.gtfs.zipGTFS,
					BoolUseRealTime: form.gtfs.BoolUseRealTime,
					addrGTFSTripUpdate: form.gtfs.addrGTFSTripUpdate,
					addrGTFSAlert: form.gtfs.addrGTFSAlert,
					addrGTFSVehiclePosition: form.gtfs.addrGTFSVehiclePosition
				}
			}
			clientServeurGestBD.emit('createAgency', formValide, function (isSuccess, agency) {
				if (isSuccess) {
					console.log("Inscription en base de donnée réussie.");
					socket.emit('userCallback', "Inscription en base de donnée réussie, accès à vos données GTFS...", "info");
					updateGTFSRecupDonnee(socket, agency._id,
						function (err) {
							if (!err) {
								jetonsConnexionAuto[socket.id] = agency;
								callback(null, socket.id);
							}
							else {
								callback(err);
							}
						}
					);
				}
				else {
					callback();
					socket.emit('userCallback', "Inscription en base de donnée échouée.", "danger");
				}
			});
		}
	});
	socket.on('updateAgency', function (form, callback) {
		console.log("Mise à jour des informations en cours...");
		socket.emit("userCallback", "Validation du formulaire en cours...", "info");
		//Tableaux qui contiendra les erreurs si on en trouve, il
		//sera utilisé pour les afficher à l'utilisateur
		var formErrors = [];

		//Vérification des informations générales
		if (typeof form.infoGenerales != "undefined") {
			if (typeof form.infoGenerales.inputIdAgency == "undefined") {
				formErrors.push("L'id de l'agence est indéfinie.");
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
			 	Validation du pays
			*/
			if (typeof form.infoGenerales.pays == "undefined" || form.infoGenerales.pays.length != 2 || !validator.isAlpha(form.infoGenerales.pays)) {
				formErrors.push("Le pays n'est pas définie, ou est incorrect.");
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
			 Validation du téléphone
			 */
			if (typeof form.infoGenerales.telephone == "undefined" || !validator.matches(form.infoGenerales.telephone, '^\\+?[0-9]{9,11}$')) {
				formErrors.push("Le numéro de téléphone n'est pas définie, ou est incorrect.");
			}
		}
		else {
			formErrors.push("Les informations générales ne sont pas définies.");
		}

		//Vérification des informations techniques (GTFS)
		if (typeof form.gtfs != "undefined") {
			if (typeof form.gtfs.zipGTFS == "undefined" || !validator.isURL(form.gtfs.zipGTFS)) {
				formErrors.push("L'adresse du fichier GTFS est incorrect ou non définie.");
			}
			if (typeof form.gtfs.BoolUseRealTime != "undefined" && form.gtfs.BoolUseRealTime) {
				if (typeof form.gtfs.addrGTFSAlert == "undefined" || !validator.isURL(form.gtfs.addrGTFSAlert)) {
					formErrors.push("L'adresse du fichier GTFSRealtime Alert est incorrect ou non définie.");
				}
				if (typeof form.gtfs.addrGTFSTripUpdate == "undefined" || !validator.isURL(form.gtfs.addrGTFSTripUpdate)) {
					formErrors.push("L'adresse du fichier GTFSRealtime Trip Update est incorrect ou non définie.");
				}
				if (typeof form.gtfs.addrGTFSVehiclePosition == "undefined" || !validator.isURL(form.gtfs.addrGTFSVehiclePosition)) {
					formErrors.push("L'adresse du fichier GTFSRealtime Vehicle Position est incorrect ou non définie.");
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

		//On vérifie si on a trouvé des erreurs dans le formulaire
		if (formErrors.length == 0) {

			async.waterfall([
				function (recuperationAgenceTermine) {
					clientServeurGestBD.emit('selectAgencies', { _id: form.infoGenerales.inputIdAgency }, recuperationAgenceTermine);
				},
				function (compagnies, enregistrementTermine) {
					//On prend ce qu'on a besoin, et pas l'objet qui nous est envoyé tel quel
					if (typeof compagnies[0].password == "undefined" && form.infoGenerales.motDePasse == "") {
						socket.emit("userCallback", "Mot de passe nécessaire.", 'danger');
						callback();
					}
					else {
						socket.emit("userCallback", "Formulaire valide, enregistrement en base de donnée...", 'info');
						var formUpdate = {
							email: form.infoGenerales.email,
							ville: form.infoGenerales.ville,
							agency_pays: form.infoGenerales.pays,
							adresse: form.infoGenerales.adresse,
							agency_phone: form.infoGenerales.telephone,
							zipGTFS: form.gtfs.zipGTFS,
							BoolUseRealTime: form.gtfs.BoolUseRealTime,
							addrGTFSTripUpdate: form.gtfs.addrGTFSTripUpdate,
							addrGTFSAlert: form.gtfs.addrGTFSAlert,
							addrGTFSVehiclePosition: form.gtfs.addrGTFSVehiclePosition
						};
						if (form.infoGenerales.motDePasse != "") {
							formUpdate.password = form.infoGenerales.motDePasse;
						}
						clientServeurGestBD.emit('updateAgency', { _id: compagnies[0]._id }, formUpdate, function (isSuccess) {
							if (isSuccess) {
								socket.emit("userCallback", "Formulaire enregistré.", 'success');
							}
							else {
								socket.emit("userCallback", "Erreur lors de l'enregistrement du formulaire.", 'error');
							}
							callback();
							enregistrementTermine();
						});
					}
				}
			]);

		}

		else {
			socket.emit("userCallback", formErrors, "danger");
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
		socket.emit('userCallback', "Connexion au serveur de récupération de donnée et requête...", "info");
		updateGTFSRecupDonnee(socket, idAgency, callback);
	});
});
function updateGTFSRecupDonnee(socket, idAgency, callback) {
	clientSockIo('http://localhost:9009/').emit('updateGTFS', idAgency, callback)
		.on('userCallback', function (message, typeMessage) {
			socket.emit('userCallback', message, typeMessage);
		}
	)
		.on('error', function (e) {
			console.log("Erreur");
			socket.emit('userCallback', "Le serveur de récupération de donnée n'est pas disponible, merci de réessayer plus tard.", "error");
		}
	);
}