var async =     require('async'), //Pour pouvoir faire s'enchainer des fonctions en asynchrone
io =            require('socket.io')(port), // Socket.IO pour la communication entre serveurs
_ =             require('underscore'), 
color =         require('colors'), //Pour mettre des couleurs dans les logs
fs =            require('fs'), //Pour gerer les fichiers
clientGestBD =  require('socket.io-client')('http://localhost:7007/', { reconnection : true, reconnectionDelay : 2000, reconnectionDelayMax : 100000 }),
url =           require('url'), //Pour gerer les url 
path = 			require('path'),
exec = 			require('exec'),
request = 		require('request'),
unzip = 		require('unzip'),
csv = 		require('csv'),
port = 9009, // Port d'écoute des sockets
downloadDir = 'downs';

clientGestBD.on('connect', function(){ console.info("Connecté au serveur de la base de donnée.".green); clientGestBD.connecte = true; });
clientGestBD.on('event', function(data){ console.log(data); });
clientGestBD.on('disconnect', function(){ console.error("Déconnecté du serveur de la base de donnée.".red); clientGestBD.connecte = false; });
clientGestBD.on('reconnecting', function(n) { console.info("Reconnexion en cours (".yellow + n + ") ...".yellow); });
clientGestBD.on('reconnect_error', function() { console.error("Reconnexion échouée".red);});
clientGestBD.on('reconnect_failed', function() { console.error("Reconnexion impossible.".red); });



//Tableau qui contiens tous les noms de fichiers du protocole GTFS ()
var GTFSFiles = [   'agency'
					,'calendar_dates'
					,'calendar'
					,'fare_attributes'
					,'fare_rules'
					,'feed_info'
					,'frequencies'
					,'routes'
					,'shapes'
					,'stop_times'
					,'stops'
					,'transfers'
					,'trips'];

io.on('connection', function (socket) {
	console.log(colors.cyan("Un client est connecté" + socket.client));
	/*

		Agencie {
			name: "Nom",
			urlGTFS: "GTFS",
			email: "",
			password: "...",
			adress: "",
			zipCode: 64000,
			urlSIRI: ""

		}
	*/
	socket.on('agencySubscribe', function (Agency) {
		console.log("------------------------------".bold);
		console.log("Demande d'inscription de l'agence : ".blue + Agency.name.grey);
		console.log("Url GTFS : ".blue + Agency.urlGTFS.grey);
		console.log("Url Siri : ".blue + Agency.urlSIRI.grey);
		console.log("Email : ".blue + Agency.email.grey);
		console.log("Url GTFS : ".blue + Agency.adress.grey);
		console.log("------------------------------".bold);
		downloadGTFS(Agency.name, Agency.urlGTFS);
	});
	socket.on("requestPerimeter", function (point, perimeter) {
		console.log("------------------------------".bold);
		console.log("Demande de périmetre reçue.".purple)
		if (!clientGestBD.connecte) {
			socket.emit("requestPerimeter", { error: 1 });
			console.log("On est déconnecté du serveur de gestion de la bdd.".red);
		}
		else {
			console.log("Connexion à la bdd OK".green);
			console.log("Requête à la bdd...");
			clientGestBD.emit('searchStop', { point: point, perimeter: perimeter }, function (result) { 
				if (!result.etat) {
					console.error("Le serveur de gestion de bd a renvoyé une erreur.".red);
				}
				else {
					console.info("Récupération des arrêts OK".green)
					var lignes = {};                    
					for (stop in result.stops) {
						clientGestBD.emmit('selectStopsLines', { arretId: stop.stop_id }, function (result) { 
							if (!result.etat) {
								console.error("Le serveur de gestion de bd a renvoyé une erreur.".red);
							}
							else {
								
							}
						});
					}
				}
				console.log("------------------------------".bold);

			});
		}
	});

});


function downloadGTFS(name, urlGTFS, callback) {
	console.log("----------------------");
	console.log('Téléchargement de '.grey + urlGTFS.grey);
	fileLocation = downloadDir + '/' + name + '.zip';
	async.series(
		[
			function (cb) {
				//On efface le dossier de stockage des fichiers GTFS s'il existe
				exec( (process.platform.match(/^win/) ? 'rmdir /Q /S ' : 'rm -rf ') + downloadDir, function(e, stdout, stderr) {
					try {
						//On recréer le dossier de manière synchrone
						fs.mkdirSync(downloadDir);
						//On continu
						cb();
					} catch(e) {
						if(e.code == 'EEXIST') {
							//Si on a cette erreur c'est que le dossier existe et donc qu'il n'est pas effacé, on continue quand même
							cb();
						} else {
							//Sinon on lève l'erreur
							cb(e);
						}
					}
				});
			},
			function (cb) {
				//On parse l'URL et on vérifie que le protocole est bien http ou https, sinon on essaye de récuperer le fichier
				//sur le système local afin de pouvoir réaliser des tests sans connexion
				var file_protocol = url.parse(urlGTFS)['protocol']; 
				if (file_protocol === 'http:' || file_protocol === 'https:') {
					request(urlGTFS, processFile).pipe(fs.createWriteStream(fileLocation));
					function processFile(e, response, body){
						if(response && response.statusCode != 200){ cb(new Error('Impossible de télécharger le fichier')); }
						console.log(urlGTFS + ': Download successful');

						fs.createReadStream(fileLocation)
						.pipe(unzip.Extract({ path: downloadDir }).on('close', cb))
						.on('error', cb);
					}
				} else {
					if (!fs.existsSync(urlGTFS)) return cb(new Error('Le fichier demandé n\'existe pas'));
					fs.createReadStream(urlGTFS)
						.pipe(fs.createWriteStream(fileLocation))
						.on('close', function(){
								fs.createReadStream(fileLocation)
								.pipe(unzip.Extract({ path: downloadDir }).on('close', cb))
								.on('error', cb);
							}
						)
						.on('error', cb);
				}
			},
			function (allFilesProcessed) {
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
				var toGrab = [
					{
						fileName: 'agency.txt',
						required: true,
						internalName: "compagnie", //Nom interne
						internalId: "agency_id",
						attributes: {
							agency_id: 			{ required: true },
							agency_name: 		{ required: true },
							agency_url: 		{ required: true }, //Site officiel de la compagnie
							agency_fare_url: 	{ required: false }, //Lien d'achat de ticket pour la compagnie
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
				var toReturn = {};
				async.eachSeries(toGrab, 
					function (file, fileHasBeenProcessed) {
						var filepath = path.join(downloadDir, file.fileName);
						if (!_.has(toReturn, file.internalName)) {
							toReturn[file.internalName] = {};
						}
						if (!fs.existsSync(filepath)) {
							if (file.required)
								return fileHasBeenProcessed(new Error("Fichier " + file.fileName + " introuvable"));
							return fileHasBeenProcessed();
						}
						console.log("Importation du fichier " + file.fileName.grey + " de la compagnie " + name.grey);
						var input = fs.createReadStream(filepath);
						var parser = csv.parse({columns: true});
						parser.on('readable', 
							function () {
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
									else {
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

										if (_.has(file.attributes[attribute], 'type')) {
											if (file.attributes[attribute].type == "Int") {
												toReturn[file.internalName][id][attribute] = parseInt(line[attribute]);
											}
											if (file.attributes[attribute].type == "Float") {
												toReturn[file.internalName][id][attribute] = parseFloat(line[attribute]);
											}
										}
										else {
											toReturn[file.internalName][id][attribute] = line[attribute];
										}
									}
								}
							}
						);
						parser.on('end', 
							function(count){
								console.log("Fichier " + file.fileName.grey + " de la compagnie " + name.grey + " importé");
								fileHasBeenProcessed();
							}
						);
						parser.on('error', fileHasBeenProcessed);
						input.pipe(parser);
					}, function (e){
						console.log(toReturn);
						allFilesProcessed(e);
					}
				);
			}
		],
		function (a) {
			callback(a);
		}
	);
}
function test(a) {
	console.log("ok");
	console.log(a);
}
downloadGTFS("Test", "Test.zip", test);