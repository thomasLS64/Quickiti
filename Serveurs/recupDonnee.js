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
downloadDir = '../Test/GTFSDatas';				//Nom du dossier de téléchargment des fichiers GTFS
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
		Inscription d'une agence

		Paramètre : 
			Agency {
				name: "...",
				urlGTFS: "...",
				email: "...",
				password: "...",
				adress: "...",
				zipCode: "...",
				urlSIRI: "...",
				urlGTFSRealtime: "..."
			}

		- On se connecte alors au serveur GTFS s'il y en a un puis on télécharge le fichier zip, on le dézippe puis
		on lit les données qu'on transforme pour les envoyer au serveur de gestion de la base de donnée

	*/
	socket.on('agencySubscribe', function (Agency, callback) {
		if (!clientGestBD) { //Si on est pas connecté au SGBD, on renvoie une erreur.
			callback({ error: "notConnectedToSGBD" });
			return false;
		}
		console.log("------------------------------".bold);
		console.log("Demande d'inscription de l'agence : " + Agency.name.grey);
		console.log("Url GTFS : " + Agency.urlGTFS.grey);
		console.log("Url Siri : " + Agency.urlSIRI.grey);
		console.log("Url GTFSRealtime : " + Agency.urlGTFSRealtime.grey);
		console.log("Email : " + Agency.email.grey);
		console.log("Adresse : " + Agency.adress.grey);
		console.log("------------------------------".bold);

		//Préparation de la requête vers le sgbd :
		var reponse = Agency;

		// Enchainement asynchrone de fonctions
		async.series({
			GTFS: function (traitementGTFSTermine) {
				if (Agency.urlGTFS == "") {
					traitementGTFSTermine(null);
				}
				else {
					//Téléchargement et traitements des fichiers GTFS si ils existent
					downloadAndParseGTFS(Agency.name, Agency.urlGTFS, traitementGTFSTermine);
				}
			},
			SIRI: function (traitementSIRITermine) {
				traitementSIRITermine(null);
			}
		},
		function (err, results) {
			if (!err) {
				reponse.gtfs = results.GTFS;
				reponse.siri = results.SIRI;
				if (!clientGestBD) { //Si on est pas connecté au SGBD, on renvoie une erreur.
					callback({ error: "notConnectedToSGBD" });
				}
				else {
					callback(reponse);
				}
			}
			else {
				callback({ error: err });
			}
		});
	});
	socket.on('searchRoutesRealTime', function (stops, callback) {
		//Vérification de l'existance de données en temps réel 

		//
	});
});
function clearDirectory(directory, cb) {
	//On efface le dossier de stockage des fichiers GTFS s'il existe

	exec((process.platform.match(/^win/) ? 'rmdir /Q /S ' : 'rm -rf ') + directory, 
		function(e, stdout, stderr) {
			if (e) cb(e);
			else cb();
		}
	);
}
function downloadFile(fileUrl, destinationFile, cb) {
	//On parse l'URL et on vérifie que le protocole est bien http ou https, sinon on essaye de récuperer le fichier
	//sur le système local afin de pouvoir réaliser des tests sans connexion
	var file_protocol = url.parse(fileUrl)['protocol']; 
	/*
		Si le fichier est sur un serveur web
	*/
	if (file_protocol === 'http:' || file_protocol === 'https:') {
		request(fileUrl, function () {
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
function parseGTFS(directory, callback) {
	/*
		var compagnieSchema = {
			agency_id : String,
			agency_name : String,
			agency_main_site_url : String, //Site officiel de la compagnie
			agency_gtfs_url: String, //Lien du zip avec les fichiers GTFS
			agency_fare_url: String, //Lien d'achat de ticket pour la compagnie
			agency_timezone : String,
			agency_phone : String,
			agency_lang : String,
			email : { type : String, match: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/ },
			password : String
		};
		var arretSchema = new mongoose.Schema({
			stop_id : String,
			stop_name : String,
			stop_desc : String,
			stop_lat : Number,
			stop_lon : Number,
			stop_url : String,
			location_type : Number,
			location : { type: [Number], index : "2dsphere" },
			compagnieId : Schema.ObjectId
		});
		var ligneSchema = new mongoose.Schema({
			route_id : String,
			route_short_name : String,
			route_long_name : String,
			route_desc : String,
			route_type : String,
			service_id : String,
			trip_id : String,
			trip_headsign : String,
			compagnieId : Schema.ObjectId
		});
		*/
		//Objet qui représente les information à récuperer dans les fichiers GTFS
		var toGrab = [
			{								//Pour chaque fichier, on a un objet avec : 
				fileName: 'agency.txt', 	//Nom du fichier
				required: true,				//Est-il obligatoire ?
				internalName: "compagnie", 	//Nom interne
				internalId: "agency_id",	//Attribut qui servira d'identifiant, pour l'objet qui sera renvoyé
				attributes: {				//Liste des attributs à récupérer dans ce fichier
					agency_id: 			{ required: true },
					agency_name: 		{ required: true },
					agency_url: 		{ required: true }, 	//Site officiel de la compagnie
					agency_fare_url: 	{ required: false }, 	//Lien d'achat de ticket pour la compagnie
					agency_timezone: 	{ required: false },
					agency_phone: 		{ required: false },
					agency_lang: 		{ required: false },
				}
			},
			{
				fileName: 'stops.txt',
				required: true,
				internalName: "arret",
				internalId: "stop_id",
				attributes: {
					stop_id: 			{ required: true },
					stop_code: 			{ required: false },
					stop_name: 			{ required: true },
					stop_lat: 			{ required: true, type: "Float" },
					stop_lon: 			{ required: true, type: "Float" },
					stop_url: 			{ required: false },
					location_type: 		{ required: true, type: "Int" },
				}
			},
			{
				fileName: 'routes.txt',
				required: true,
				internalName: "ligne",
				internalId: "route_id",
				attributes: {
					route_id: 			{ required: true },
					route_short_name: 	{ required: true },
					route_long_name: 	{ required: true },
					route_desc: 		{ required: true },
					route_type: 		{ required: true },
				}
			},
			{
				fileName: 'trips.txt',
				required: true,
				internalName: "ligne",
				internalId: "route_id",
				attributes: {
					route_id: 			{ required: true },
					service_id: 		{ required: true },
					trip_id: 			{ required: true },
					trip_headsign: 		{ required: true },
				},
			},
		];
		var toReturn = {}; //Préparation de la réponse
		//Pour chaque éléments du tableau, on applique une fonction qui traite le fichier associé
		async.eachSeries(toGrab, 
			function (file, fileHasBeenProcessed) {
				var filepath = path.join(directory, file.fileName);
				//Si le fichier contient des informations à insérer attribut qui n'a pas encore été crée dans la réponse, on le créer
				if (!_.has(toReturn, file.internalName)) {
					toReturn[file.internalName] = {};
				}
				if (!fs.existsSync(filepath)) {
					if (file.required) { //Si le fichier n'existe pas et qu'il a été définie comme obligatoire, on lève une erreur
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
							//On vérifie si l'attribut qui sert d'ID est présent, sinon on lève une erreur
							if (!_.has(file.attributes, file.internalId)) {
								return fileHasBeenProcessed(new Error("L'attribut d'identification " + file.internalId + " n'a pas été trouvé dans le fichier " + file.fileName));
							}
							else { //Sinon on créer dans la réponse l'objet qui recevra les informations de la ligne qu'on est entrain de lire si l'objet n'existe pas déjà
								var id = line[file.internalId];
								if (!_.has(toReturn[file.internalName], id)) {
									toReturn[file.internalName][id] = {};
								}
							}
							//Pour chaques attributs à récuperer dans le fichier
							for (var attribute in file.attributes) {
								//On vérifie que l'attribut est bien présent dans la ligne qu'on est entrain de scanner, si
								//c'est pas le cas on lève une erreur, sinon on continue en transtypant l'information si un type a été donnée
								if (file.attributes[attribute].required && !_.has(line, attribute)) {
									return fileHasBeenProcessed(new Error("L'attribut " + attribute + " n'a pas été trouvé dans le fichier " + file.fileName));
								}
								//On transtype l'information si nécessaire
								if (_.has(file.attributes[attribute], 'type')) {
									if (file.attributes[attribute].type == "Int") {
										toReturn[file.internalName][id][attribute] = parseInt(line[attribute]);
									}
									if (file.attributes[attribute].type == "Float") {
										toReturn[file.internalName][id][attribute] = parseFloat(line[attribute]);
									}
								}
								else { //Sinon on la met telle quelle
									toReturn[file.internalName][id][attribute] = line[attribute];
								}
							} //On a lu un attribut
						} //On a lu une ligne
					}
				); //On a traiter un flot d'information
				
				//Evenement quand on a finit de lire le fichier
				parser.on('end', 
					function(count){
						console.log("Fichier " + file.fileName.grey + " importé");
						fileHasBeenProcessed();
					}
				);
				parser.on('error', fileHasBeenProcessed);
				input.pipe(parser);
			},

			//Quand on a finis de lire tous les fichiers :
			function (err){
				if (err) {
					callback(err);
				}
				else{
					callback(null, toReturn);
				}
			}
		);
}
function downloadAndParseGTFS(name, urlGTFS, callback) {
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
				downloadFile(urlGTFS, zipFileName, cb);
			},
			function (cb) {
				console.log("Décompréssion du fichier ...");
				unzipAt(zipFileName, fileLocation, cb);
			},
			function (cb) {
				console.log("Traitement des fichiers GTFS...");
				parseGTFS(fileLocation, cb)
			},
			function (cb) {
				console.log("Nettoyage du dossier " + downloadDir.grey + " ...");
				//clearDirectory(fileLocation, cb);
				cb();
			}
		],
		function (err, results) {
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
				if (entity.trip_update) {
					console.log(entity.trip_update);
				}
			});
		}
	});
}