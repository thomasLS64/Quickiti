//On place le repertoire de travail dans le repertoire où se situe le fichier
process.chdir(__dirname);
//On définie toutes les dépendances, et on lance l'écoute du serveur de récupération de donnée sur le port 9009
var async =     require('async'), 				//pouvoir faire s'enchainer des fonctions en asynchrone
port = 9009, 									//Port d'écoute du serveur de récupération de données
io =            require('socket.io')(port),		// Socket.IO pour la communication entre serveurs
_ =             require('underscore'), 
color =         require('colors'), 				//mettre des couleurs dans les logs
fs =            require('fs'), 					//gerer les fichiers
clientSockIo =  require('socket.io-client'), 	//Client vers le serveur de base de donnée
url =           require('url'), 				//gerer les url 
path = 			require('path'), 
exec = 			require('exec'), 				//supprimer les fichiers temporaires
request = 		require('request'), 			//récuperer des fichiers sur un serveur web
unzip = 		require('unzip'), 				//dézipper les fichiers zip qu'on récupère
csv = 			require('csv'), 				//traiter les fichiers GTFS
GtfsRealtimeBindings = require('gtfs-realtime-bindings'), // GTFS RealTime
downloadDir = '../Data/GTFSDatas';				//Nom du dossier de téléchargment des fichiers GTFS
try {
	fs.mkdirSync(downloadDir);
}
catch (err) {
	if (err.code != 'EEXIST') {
		console.log(err);
		throw err;
	}
}
/* 
	Client vers la base de donnée
*/


clientGestBD = clientSockIo('http://localhost:7007/', { 
												reconnection : 			true,  //Reconnexion automatique
												reconnectionDelay : 	2000,  //Reconnexion toutes les 2 secondes
												reconnectionDelayMax : 	100000 //Temps maximum passé à essayer de se reconnecter
}); 

/*
	Evenement déclanché quand on est connecté au serveur de gestion de base de donnée
*/

clientGestBD.on('connect', function(){ 
	console.info("Connecté au serveur de gestion de la base de donnée.".green);
	clientGestBD.connecte = true; //Variable qui indique l'état de la connexion au serveur
});

/*
	Evenement déclanché quand on est déconnecté du serveur de gestion de base de donnée
*/

clientGestBD.on('disconnect', function(){ 
	console.error("Déconnecté du serveur de la base de donnée.".red);
	clientGestBD.connecte = false;
});

/*
	Evenement déclanché quand on tente de se reconnecter au serveur de gestion de la bdd
*/

clientGestBD.on('reconnecting', function(n) { 
	console.info("Reconnexion en cours (".yellow + n + ") ...".yellow); 
});

/*
	Evenement déclanché quand une tentative de reconnexion au serveur de gestion de la bdd a échoué
*/

clientGestBD.on('reconnect_error', function() { 
	console.error("Reconnexion échouée".red);
});

/*
	Evenement déclanché quand on a atteind la limite de temps passé à essayer de se reconnecter au serveur de gestion de la bdd
*/

clientGestBD.on('reconnect_failed', function() { 
	console.error("Reconnexion impossible.".red);
});

/*
	Serveur de récupération de donnée
*/

/*
	Evenement déclanché lorsqu'un client se connecte au serveur de récupération de donnée
*/

io.on('connection', function (socket) {

	console.log("Un client est connecté");
	/*
		Mise à jour des données d'une agence

		Paramètre : 
			AgencyId

		- On se connecte alors au serveur GTFS s'il y en a un puis on télécharge le fichier zip, on le dézippe puis
		on lit les données qu'on transforme pour les envoyer au serveur de gestion de la base de donnée

	*/
	socket.on('updateGTFS', function (agencyId, callback) {
		if (!clientGestBD) { //Si on est pas connecté au SGBD, on renvoie une erreur.
			callback({ error: "notConnectedToSGBD" });
			return false;
		}
		console.log("------------------------------".bold);
		console.log("Demande de mise à jour d'une agence (" + agencyId + ")");
		console.log("------------------------------".bold);

		// Enchainement asynchrone de fonctions
		async.waterfall([
				function (recupTermine) {
					console.log("Recupération de l'agence..." + agencyId);
					clientGestBD.emit('selectAgencies', { _id: agencyId }, recupTermine);
				},
				function (agency, traitementGTFSTermine) {
					agency = agency[0];
					if (agency.urlGTFSFile == "") {
						traitementGTFSTermine(null);
					}
					else {
						//Téléchargement et traitements des fichiers GTFS si ils existent
						downloadAndParseGTFS(agency._id, agency.urlGTFSFile, function (message, typeMessage) {
							socket.emit("userCallback", message, typeMessage);
						}, traitementGTFSTermine);
					}
				},
				function (GTFS, updateBDAgencyTermine) {
					console.log("Mise à jour de l'agence...");
					socket.emit("userCallback", "Mise à jour de l'agence...", 'info');
					var agency = GTFS.compagnie[0]

					clientGestBD.emit('updateAgency', {
						_id: agencyId
					},  {
						agency_id: agency.agency_id,
						agency_timezone: agency.agency_timezone,
						agency_name: agency.agency_name,
						agency_url: agency.agency_url,
						agency_phone: agency.agency_phone,
						agency_lang: agency.agency_lang,
						agency_fare_url: agency.agency_fare_url
					}, function (isSuccess) {
						if (isSuccess) {
							updateBDAgencyTermine(null, GTFS);
						}
						else {
							updateBDAgencyTermine({error: "Mise à jour de l'agence échouée."});
							socket.emit("userCallback", "Mise à jour de l'agence échouée", 'danger');

						}
					});
				},
				//MISE A JOUR / INSERTION DES ARRÊTS
				function (GTFS, updateBDStopsTermine) {
					console.log("Mise à jour de l'agence terminée.");
					console.log("Mise à jour des arrêts...");
					socket.emit("userCallback", "Mise à jour des arrêts...", 'info');
					//On applique la fonction (3eme paramètre) sur chaque item du tableau (1er paramètre)
					//En limitant à 3 en même temps pour ne pas flooder la bdd
					async.eachLimit(GTFS.arret, 1,
						function (stop, arretTermine) {
							console.log("Insertion de " + stop.stop_id);
							var newStop = {};
							newStop.stop_id = stop.stop_id;
							newStop.stop_name = stop.stop_name;
							newStop.stop_desc = stop.stop_desc;
							newStop.stop_url = stop.stop_url;
							newStop.location_type = stop.location_type;
							newStop.stop_lat = stop.stop_lat;
							newStop.stop_lon = stop.stop_lon;
							newStop.compagnieId = agencyId;
							/* Dans l'ordre :
								On vérifie si l'arrêt existe déjà
								Si il existe, on le met à jour
								Sinon, on le créer
							 */
							async.waterfall([
									function (verifArretExisteTermine) { //On vérifie si l'arrêt existe déjà
										clientGestBD.emit(
											'selectStops',  //On sélectionne les arrêts
											{ stop_id: stop.stop_id, compagnieId: agencyId }, //Qui correspondent à ces critères
											verifArretExisteTermine // Callback
										);
									},
									function (result, traitementArretOk) {
										console.log(result);
										console.log(traitementArretOk);
										if (result.length == 0) { //Si l'arrêt n'existe pas
											//On le créer
											clientGestBD.emit('createStop', newStop, function (isSuccess) {
												console.log("Arrêt " + newStop.stop_id + " créer.");
												if (isSuccess) { traitementArretOk(); }
												else { traitementArretOk("Erreur lors du traitement de l'arret " + stop.stop_id); }
											});
										}
										else {

											clientGestBD.emit('updateStop', { _id: result[0]._id }, newStop, function (isSuccess) {
												console.log("Arrêt " + newStop.stop_id + " mis à jour.");
												if (isSuccess) { traitementArretOk(); }
												else { traitementArretOk("Erreur lors du traitement de l'arret " + stop.stop_id); }
											});
										}
									}
								],
								arretTermine // ON termine le traitement de l'arrêt
							);
						},
						function (err) {
							console.log("Traitement des arrêts terminé.");
							updateBDStopsTermine(err, GTFS);
						}
					);
				},
				//MISE A JOUR / INSERTION DES LIGNES
				function (GTFS, updateBDLineTermine) {
					console.log("Mise à jour des arrêts terminée.");
					console.log("Mise à jour des lignes...");
					socket.emit("userCallback", "Mise à jour des lignes...", 'info');
					//On applique la fonction (3eme paramètre) sur chaque item du tableau (1er paramètre)
					//En limitant à 1 en même temps pour ne pas flooder la bdd
					async.eachLimit(GTFS.ligne, 1,
						function (ligne, ligneTermine) {
							console.log("Insertion de " + ligne.route_id);


							/* Dans l'ordre :
							 On vérifie si l'arrêt existe déjà
							 Si il existe, on le met à jour
							 Sinon, on le créer
							 */
							async.waterfall([
									function (verifLigneExisteTermine) { //On vérifie si l'arrêt existe déjà
										clientGestBD.emit(
											'selectLines',  //On sélectionne les lignes
											//Qui correspondent à ces critères
											{ route_id: ligne.route_id, compagnieId: agencyId },
											verifLigneExisteTermine // Callback
										);
									},
									function (result, traitementLigneOk) {
										var newLine = {};
										for (attr in ligne) {
											newLine[attr] = ligne[attr];
										}
										newLine.compagnieId = agencyId;
										if (result.length == 0) { //Si l'arrêt n'existe pas
											//On le créer
											clientGestBD.emit('createLine', newLine, function (isSuccess) {
												console.log("Ligne " + newLine.route_id + " créer.");
												if (isSuccess) { traitementLigneOk(); }
												else { traitementLigneOk("Erreur lors du traitement de la ligne " + route.route_id); }
											});
										}
										else {
											clientGestBD.emit('updateLine', { _id: result[0]._id }, newLine, function (isSuccess) {
												console.log("Ligne " + newLine.route_id + " mis à jour.");
												if (isSuccess) { traitementLigneOk(); }
												else { traitementLigneOk("Erreur lors du traitement de la ligne " + route.route_id); }
											});
										}
									}
								],
								ligneTermine // ON termine le traitement de la ligne
							);
						},
						function (err) {
							console.log("Traitement des lignes terminé.");
							updateBDLineTermine(err, GTFS);
						}
					);
				},
				//MISE A JOUR / INSERTION DES TRAJETS
				function (GTFS, updateBDTripTermine) {
					console.log("Mise à jour des lignes terminée.");
					console.log("Mise à jour des trajets...");
					socket.emit("userCallback", "Mise à jour des trajets...", 'info');
					//On applique la fonction (3eme paramètre) sur chaque item du tableau (1er paramètre)
					//En limitant à 1 en même temps pour ne pas flooder la bdd
					async.eachLimit(GTFS.trajet, 1,
						function (trajet, trajetTermine) {
							console.log("Insertion de " + trajet.trip_id);
							/* Dans l'ordre :
							 On vérifie si l'arrêt existe déjà
							 Si il existe, on le met à jour
							 Sinon, on le créer
							 */
							async.waterfall([
									function (verifTrajetExisteTermine) { //On vérifie si l'arrêt existe déjà
										clientGestBD.emit(
											'selectLines',  //On sélectionne les lignes
											//Qui correspondent à ces critères
											{ trip_id: trajet.trip_id, compagnieId: agencyId },
											verifTrajetExisteTermine // Callback
										);
									},
									function (result, traitementTrajetOk) {
										var newTrip = {};
										for (attr in trajet) {
											newTrip[attr] = trajet[attr];
										}
										newTrip.compagnieId = agencyId;
										if (result.length == 0) { //Si l'arrêt n'existe pas
											//On le créer
											clientGestBD.emit('createLine', newTrip, function (isSuccess) {
												console.log("Trajet " + newTrip.trip_id + " créer.");
												if (isSuccess) { traitementTrajetOk(); }
												else { traitementTrajetOk("Erreur lors du traitement de la ligne " + trip.trip_id); }
											});
										}
										else {
											clientGestBD.emit('updateLine', { _id: result[0]._id }, newTrip, function (isSuccess) {
												console.log("Trajet " + newTrip.trip_id + " mis à jour.");
												if (isSuccess) { traitementTrajetOk(); }
												else { traitementTrajetOk("Erreur lors du traitement de la ligne " + trip.trip_id); }
											});
										}
									}
								],
								trajetTermine // ON termine le traitement du trajet
							);
						},
						function (err) {
							console.log("Traitement des trajets terminé.");
							console.log(err);
							updateBDTripTermine(err, GTFS);
						}
					);
				},
				function (GTFS, updateBDStopLineTermine) {
					console.log("Mise à jour des trajets terminée.");
					console.log("Mise à jour des correspondances arrêts / ligne...");
					socket.emit("userCallback", "Mise à jour des correspondances arrêts / ligne...", 'info');
					//On applique la fonction (3eme paramètre) sur chaque item du tableau (1er paramètre)
					//En limitant à 1 en même temps pour ne pas flooder la bdd
					async.eachLimit(GTFS.arretLigne, 1,
						function (arretLigne, arretLigneTermine) {
							console.log("Insertion de la correspondance " + arretLigne.trip_id + "/" + arretLigne.stop_id);
							/* Dans l'ordre :
							 On vérifie si l'arrêt existe déjà
							 Si il existe, on le met à jour
							 Sinon, on le créer
							 */
							async.waterfall([
									//On récupére l'arret et la ligne
									function (recupLigneTermine) {
										clientGestBD.emit('selectLines', { compagnieId: agencyId, trip_id: arretLigne.trip_id },
											recupLigneTermine
										);
									},
									function (ligne, recupArretTermine) {
										clientGestBD.emit('selectStops', { compagnieId: agencyId, stop_id: arretLigne.stop_id },
											function (err, arrets) {
												recupArretTermine(err, ligne[0], arrets[0]);
											}
										);
									},
									function (ligne, arret, verifArretLigneExisteTermine) { //On vérifie si la correspondance existe déjà
										clientGestBD.emit(
											'selectStopsLines',  //On sélectionne les corr ligne/arrets
											//Qui correspondent à ces critères
											{ arretId: arret._id, ligneId: ligne._id, stop_sequence: arretLigne.stop_sequence },
											function (err, arretLigneTrouve) {
												verifArretLigneExisteTermine(err, ligne, arret, arretLigneTrouve); // Callback
											}
										);
									},
									function (ligne, arret, result, traitementArretLigneOk) {
										var newArretLigne = {};
										for (attr in arretLigne) {
											if (attr != "trip_id" && attr != "stop_id")
												newArretLigne[attr] = arretLigne[attr];
										}
										newArretLigne.arretId = arret._id;
										newArretLigne.ligneId = ligne._id;
										newArretLigne.compagnieId = agencyId;
										if (result.length == 0) { //Si la correspondance n'existe pas
											//On le créer
											clientGestBD.emit('createStopLine', newArretLigne, function (err) {
												console.log("Correspondance " + newArretLigne.arretId + "/" + newArretLigne.ligneId + " créer.");
												if (err) { traitementArretLigneOk(); }
												else { traitementArretLigneOk("Erreur lors du traitement de la correspondance " + arretLigne.trip_id + " / " + arretLigne.stop_id); }
											});
										}
										else {
											clientGestBD.emit('updateLine', { _id: result[0]._id }, newArretLigne, function (err) {
												console.log("Correspondance " + newArretLigne.arretId + "/" + newArretLigne.ligneId + " mise à jour.");
												if (err) { traitementArretLigneOk(); }
												else { traitementArretLigneOk("Erreur lors du traitement de la correspondance " + arretLigne.trip_id + " / " + arretLigne.stop_id); }
											});
										}
									}
								],
								arretLigneTermine // ON termine le traitement du trajet
							);
						},
						function (err) {
							console.log("Traitement des lignes / arrêts terminé.");
							socket.emit("userCallback", "Traitement des lignes / arrêts terminé.", 'info');
							updateBDStopLineTermine(err, GTFS);
						}
					);
				},
				function (GTFS, traitementGTFSRealTimeTermine) {
					console.log("Mise à jour des lignes / arrêts OK");
					traitementGTFSRealTimeTermine(null);
				}
		],
		function (err, results) {
			if (!err) {
				socket.emit("userCallback", "Mise à jour terminé.", 'success');
				callback(null);
			}
			else {
				socket.emit("userCallback", "Erreur : " + err, 'danger');
				if (typeof err == "Object") err = JSON.stringify(err);
				callback(err);
			}
		});
	});

	socket.on('searchStopsNearToRealTime', function(stopsNearTo, callback) {
		if(callback) callback(null, stopsNearTo);
	});

	socket.on('searchRoutesRealTime', function (stops, callback) {
		//Vérification de l'existance de données en temps réel 
		console.log("Requête d'itinéraire en temps réel.");
	});
});
function downloadFile(fileUrl, destinationFile, cb) {
	//On parse l'URL et on vérifie que le protocole est bien http ou https, sinon on essaye de récuperer le fichier
	//sur le système local afin de pouvoir réaliser des tests sans connexion
	var file_protocol = url.parse(fileUrl)['protocol']; 
	/*
		Si le fichier est sur un serveur web
	*/
	if (file_protocol === 'http:' || file_protocol === 'https:') {
		request(fileUrl, function (response) {
			if(response && response.statusCode != 200){ 
				cb(new Error('Impossible de télécharger le fichier'));
			}
			cb();
		})
		.pipe(fs.createWriteStream(destinationFile));
	}

	/*
		Si le fichier est en local
	*/
	else {
		if (!fs.existsSync(fileUrl)) return cb(new Error('Le fichier demandé n\'existe pas'));
		fs.createReadStream(fileUrl)
			.pipe(fs.createWriteStream(destinationFile))
			.on('close', cb)
			.on('error', cb);
	}
}
function unzipAt(zipFile, directory, cb){
	fs.createReadStream(zipFile)
	.pipe(unzip.Extract({ path: directory }).on('close', cb))
	.on('error', cb);
}
function parseGTFS(directory, userCallback, callback) {
		//Objet qui représente les information à récuperer dans les fichiers GTFS
		var toGrab = [
			{								//Pour chaque fichier, on a un objet avec : 
				fileName: 'agency.txt', 	//Nom du fichier
				required: true,				//Est-il obligatoire ?
				internalName: "compagnie", 	//Nom interne
				attributes: {				//Liste des attributs à récupérer dans ce fichier
					agency_id: 			{ required: true },
					agency_name: 		{ required: true },
					agency_url: 		{ required: true }, 	//Site officiel de la compagnie
					agency_fare_url: 	{ required: false }, 	//Lien d'achat de ticket pour la compagnie
					agency_timezone: 	{ required: false },
					agency_phone: 		{ required: false },
					agency_lang: 		{ required: false }
				}
			},
			{
				fileName: 'stops.txt',
				required: true,
				internalName: "arret",
				attributes: {
					stop_id: 			{ required: true },
					stop_code: 			{ required: false },
					stop_name: 			{ required: true },
					stop_lat: 			{ required: true, type: "Float" },
					stop_lon: 			{ required: true, type: "Float" },
					stop_url: 			{ required: false },
					location_type: 		{ required: false, type: "Int" } //True
				}
			},
			{
				fileName: 'routes.txt',
				required: true,
				internalName: "ligne",
				attributes: {
					route_id: 			{ required: true },
					route_short_name: 	{ required: true },
					route_long_name: 	{ required: true },
					route_desc: 		{ required: false }, //True
					route_type: 		{ required: true }
				}
			},
			{
				fileName: 'trips.txt',
				required: true,
				internalName: "trajet",
				attributes: {
					route_id: 				{ required: true },
					service_id: 			{ required: true },
					trip_id: 				{ required: true },
					trip_headsign: 			{ required: true },
					trip_short_name: 		{ required: false },
					direction_id: 			{ required: false },
					block_id: 				{ required: false },
					shape_id: 				{ required: false },
					wheelchair_accessible: 	{ required: false },
					bikes_allowed: 			{ required: false }
				}
			},
			{
				fileName: 'stop_times.txt',
				required: true,
				internalName: "arretLigne",
				attributes: {
					trip_id: 			{ required: true },
					arrival_time: 		{ required: true },
					departure_time: 	{ required: true },
					stop_id: 			{ required: true },
					stop_sequence: 		{ required: true },
					stop_headsign: 		{ required: false },
					pickup_type: 		{ required: false },
					drop_off_type: 		{ required: false },
					shape_dist_traveled:{ required: false },
					timepoint: 			{ required: false }
				}
			}
		];
		var toReturn = {}; //Préparation de la réponse
		//Pour chaque éléments du tableau, on applique une fonction qui traite le fichier associé
		async.eachSeries(toGrab, 
			function (file, fileHasBeenProcessed) {
				var filepath = path.join(directory, file.fileName);
				//Si le fichier contient des informations à insérer attribut qui n'a pas encore été crée dans la réponse, on le créer
				if (!_.has(toReturn, file.internalName)) {
					toReturn[file.internalName] = [];
				}
				if (!fs.existsSync(filepath)) {
					if (file.required) { //Si le fichier n'existe pas et qu'il a été définie comme obligatoire, on lève une erreur
						userCallback("Fichier " + file.fileName + " introuvable.", "error");
						return fileHasBeenProcessed(new Error("Fichier " + file.fileName + " introuvable"));
					}
					return fileHasBeenProcessed(); //Sinon on passe au suivant
				}
				console.log("Importation du fichier " + file.fileName.grey);
				//On créer un stream, le fichier sera lu avec celui-ci
				var input = fs.createReadStream(filepath);
				//On initialise le parser csv
				var parser = csv.parse({columns: true});
				//Quand le parser recoit des données : 
				parser.on('readable', 
					function () {
						//On lit chaque ligne, et on extrait les informations
						while (line = parser.read()) {
							//On enleve les valeurs null
							for(var key in line){
								if(line[key] === null){
									delete line[key];
								}
							}
							var aRemplir = {};
							//Pour chaques attributs à récuperer dans le fichier
							for (var attribute in file.attributes) {
								//On vérifie que l'attribut est bien présent dans la ligne qu'on est entrain de scanner, si
								//c'est pas le cas on lève une erreur, sinon on continue en transtypant l'information si un type a été donnée
								if (file.attributes[attribute].required && !_.has(line, attribute)) {
									userCallback("L'attribut " + attribute + " n'a pas été trouvé dans le fichier " + file.fileName, "error");
									return fileHasBeenProcessed(new Error("L'attribut " + attribute + " n'a pas été trouvé dans le fichier " + file.fileName));
								}
								//On transtype l'information si nécessaire
								if (_.has(file.attributes[attribute], 'type')) {
									if (file.attributes[attribute].type == "Int") {
										aRemplir[attribute] = parseInt(line[attribute]);
									}
									if (file.attributes[attribute].type == "Float") {
										aRemplir[attribute] = parseFloat(line[attribute]);
									}
								}
								else { //Sinon on la met telle quelle
									aRemplir[attribute] = line[attribute];
								}
							} //On a lu un attribut
							toReturn[file.internalName].push(aRemplir);
						} //On a lu une ligne
					}
				); //On a traiter un flot d'information
				
				//Evenement quand on a finit de lire le fichier
				parser.on('end', 
					function(count){
						console.log("Fichier " + file.fileName.grey + " importé");
						userCallback("Fichier " + file.fileName.grey + " importé", 'info');
						fileHasBeenProcessed();
					}
				);
				parser.on('error', fileHasBeenProcessed);
				input.pipe(parser);
			},

			//Quand on a finis de lire tous les fichiers :
			function (err){
				if (err) {
					console.log(err);
					callback(err);
				}
				else{
					console.log("Lecture des fichiers terminée.");
					userCallback("Lecture des fichiers terminée.", 'info');
					callback(null, toReturn);
				}
			}
		);
}
function downloadAndParseGTFS(name, urlGTFS, userCallback, callback) {
	console.log("----------------------");
	console.log('Traitement de ' + urlGTFS.grey);
	var fileLocation = downloadDir + '/' + name;
	var zipFileName = fileLocation + '/' + name + '.zip';
	async.series(
		[
			function (cb) {
				//On créer le dossier de manière synchrone
				try {
					fs.mkdirSync(fileLocation);
				}
				catch (err) {
					if (err.code != 'EEXIST') {
						throw err;
					}
				}
				console.log("Téléchargement du fichier zip dans " + fileLocation.grey + " ...");
				userCallback('Téléchargement du fichier zip...', "info");
				downloadFile(urlGTFS, zipFileName, cb);
			},
			function (cb) {
				console.log("Décompression du fichier...");
				userCallback('Décompression du fichier zip...', "info");
				unzipAt(zipFileName, fileLocation, cb);
			},
			function (cb) {
				console.log("Traitement des fichiers GTFS...");
				userCallback('Traitement des fichiers GTFS...', "info");
				parseGTFS(fileLocation, userCallback, cb);
			}
		],
		function (err, results) {
			console.log("Traitement des fichiers terminé.");
			callback(null, results[2]);
		}
	);
};

//Fonction pour aller récupérer des infos en GTFS Realtime

function getGTFSRealtime(url, callback) {
	var requestSettings = {
		method: 'GET',
		url: url,
		encoding: null
	};
	request(requestSettings, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var feed = GtfsRealtimeBindings.FeedMessage.decode(body);
			feed.entity.forEach(function(entity) {

			});
			callback("ok");
		}
	});
}