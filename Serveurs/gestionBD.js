var port = 7007, // Port d'écoute des sockets
	io = require('socket.io')(port), // Socket.IO pour la communication entre serveurs
	mongoose = require('mongoose'), // ODM pour MongoDB
	async = require('async'),
	Schema = mongoose.Schema;

/*
**	Traitement sur la base de donnée
*/
// Connexion à la base de donnée
mongoose.connect('mongodb://localhost/quickiti', function(err) {
	if(err)
		console.log('Database connexion : false');
	else
		console.log('Database connexion : true');
});

// Création des différents schémas
//	Schéma d'une compagnie de transport
var compagnieSchema = new mongoose.Schema({
	agency_id : String,
	agency_name : String,
	agency_url : String,
	agency_timezone : String,
	agency_phone : String,
	agency_lang : String,
	email : { type : String, match: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/ },
	password : { type: String, bcrypt: true },
	urlGTFSFile : String,
	urlGTFSTripUpdate : String,
	urlGTFSAlert : String,
	urlGTFSVehiclePosition : String
});
compagnieSchema.plugin(require('mongoose-bcrypt'));
//	Schéma d'une ligne
var ligneSchema = new mongoose.Schema({
	route_id : String,
	route_short_name : String,
	route_long_name : String,
	route_desc : String,
	route_type : Number,
	service_id : String,
	trip_id : String,
	trip_headsign : String,
	trip_short_name: String,
	direction_id: Number,
	block_id: Number,
	shape_id: String,
	wheelchair_accessible: Number,
	bikes_allowed: Number,
	compagnieId : Schema.ObjectId
});

//	Schéma d'un arret
var arretSchema = new mongoose.Schema({
	stop_id : String,
	stop_name : String,
	stop_desc : String,
	stop_url : String,
	location_type : Number,
	location : { type: [Number], index : "2dsphere" },
	compagnieId : Schema.ObjectId
});

//	Schéma lien entre arret et ligne
var arretLigneSchema = new mongoose.Schema({
	arretId : Schema.ObjectId,
	ligneId : Schema.ObjectId,
	arrival_time: String,
	departure_time: String,
	stop_sequence: Number,
	pickup_type: Number,
	drop_off_type: Number,
	timepoint: Number,
	compagnieId : Schema.ObjectId
});

//	Schéma des véhicules
var vehiculeSchema = new mongoose.Schema({
	longitude : Number,
	latitude : Number,
	ligneId : Schema.ObjectId,
	compagnieId : Schema.ObjectId,
	date : { type : Date, default : Date.now }
});

// Création des modèles associés aux schémas
var compagnieModel = mongoose.model('compagnie', compagnieSchema);
var ligneModel = mongoose.model('ligne', ligneSchema);
var arretModel = mongoose.model('arret', arretSchema);
var arretLigneModel = mongoose.model('arretLigne', arretLigneSchema);
var vehiculeModel = mongoose.model('vehicule', vehiculeSchema);


/*
**	Fonctions pour la BD
*/
// Compagnie de transport - Création
function createAgency(d, callback) {
	// Initialisation de la nouvelle compagnie
	var newAgency = new compagnieModel();

	// Peuplement des différents champs
	newAgency.agency_id = 0; //Euh
	newAgency.agency_name = d.infoGenerales.raisSocial;
	newAgency.agency_url = d.infoGenerales.urlSiteWeb;
	newAgency.agency_phone = d.infoGenerales.telephone;
	newAgency.agency_lang = d.infoGenerales.pays; //À modifier
	newAgency.email = d.infoGenerales.email;
	newAgency.password = d.infoGenerales.motDePasse;
	newAgency.urlGTFSFile = d.gtfs.zipGTFS;
	newAgency.urlGTFSTripUpdate = d.gtfs.addrGTFSTripUpdate;
	newAgency.urlGTFSAlert = d.gtfs.addrGTFSAlert;
	newAgency.urlGTFSVehiclePosition = d.gtfs.addrGTFSVehiclePosition;

	// Insertion en base de données
	newAgency.save(function(err, d) {
		if(err) {
			console.log('[ERREUR] Compagnie de transport - SAVE');
			console.log(err);
			if(callback) callback(false, null);
		}
		else {
			console.log('[REUSSI] Compagnie de transport - SAVE');
			if(callback) callback(true, d);
		}
	});
}
// Compagnie de transport - Mise à jour
function updateAgency(query, update, callback) {
	compagnieModel.findOneAndUpdate(query, update, function(err, d) {
		if(err) {
			console.log('[ERREUR] Compagnie de transport - UPDATE');
			console.log(err);
			if(callback) callback(false);
		}
		else {
			console.log('[REUSSI] Compagnie de transport - UPDATE');
			if(callback) callback(true);
		}
	});
}
// Compagnie de transport - Récupération
function selectAgencies(query, callback) {
	compagnieModel.find(query, function(err, compagnie) {
		if(err) {
			console.log('[ERREUR] Compagnie de transport - SELECT');
			console.log(err);
		}
		else
			console.log('[REUSSI] Compagnie de transport - SELECT');

		if(callback) callback(err, compagnie);
	});
}

// Ligne - Création
function createLine(d, callback) {
	// Initialisation de la nouvelle ligne
	var newLine = new ligneModel();

	// Peuplement des différents champs
	newLine.route_id = d.route_id;
	newLine.route_short_name = d.route_short_name;
	newLine.route_long_name = d.route_long_name;
	newLine.route_desc = d.route_desc;
	newLine.route_type = d.route_type;
	newLine.service_id = d.service_id;
	newLine.trip_id = d.trip_id;
	newLine.trip_headsign = d.trip_headsign;
	newLine.compagnieId = d.compagnieId;

	// Insertion en base de données
	newLine.save(function(err) {
		if(err) {
			console.log('[ERREUR] Ligne - SAVE');
			console.log(err);
			if(callback) callback(false);
		}
		else {
			console.log('[REUSSI] Ligne - SAVE');
			if(callback) callback(true);
		}
	});
}
// Ligne - Mise à jour
function updateLine(query, update, callback) {
	ligneModel.findOneAndUpdate(query, update, function(err, d) {
		if(err) {
			console.log('[ERREUR] Ligne - UPDATE');
			console.log(err);
			if(callback) callback(false);
		}
		else {
			console.log('[REUSSI] Ligne - UPDATE');
			if(callback) callback(true);
		}
	});
}
// Ligne - Récupération
function selectLines(query, callback) {
	ligneModel.find(query, function(err, d) {
		if(err) {
			console.log('[ERREUR] Ligne - SELECT');
			console.log(err);
		}
		else 
			console.log('[REUSSI] Ligne - SELECT');

		if(callback) callback(err, d);
	});
}

// Arret - Création
function createStop(d, callback) {
	// Initialisation du nouvel arret
	var newStop = new arretModel();

	// Peuplement des différents champs
	newStop.stop_id = d.stop_id;
	newStop.stop_name = d.stop_name;
	newStop.stop_desc = d.stop_desc;
	newStop.stop_url = d.stop_url;
	newStop.location_type = d.location_type;
	newStop.location = [d.stop_lat, d.stop_lon];
	newStop.compagnieId = d.compagnieId;

	// Insertion en base de données
	newStop.save(function(err) {
		if(err) {
			console.log('[ERREUR] Arret - SAVE');
			console.log(err);
			if(callback) callback(false);
		}
		else {
			console.log('[REUSSI] Arret - SAVE');
			if(callback) callback(true);
		}
	});
}
// Arret - Mise à jour
function updateStop(query, update, callback) {
	arretModel.findOneAndUpdate(query, update, function(err, d) {
		if(err) {
			console.log('[ERREUR] Arret - UPDATE');
			console.log(err);
			if(callback) callback(false);
		}
		else {
			console.log('[REUSSI] Arret - UPDATE');
			if(callback) callback(true);
		}
	});
}
// Arret - Récupération
function selectStops(query, callback) {
	arretModel.find(query, function(err, d) {
		if(err) {
			console.log('[ERREUR] Arret - SELECT');
			console.log(err);
		}
		else
			console.log('[REUSSI] Arret - SAVE');

		if(callback) callback(err, d);
	});
}

// Relation Arret / Ligne - Création
function createStopLine(d, callback) {
	// Initialisation du nouveau lien
	var newStopLine = new arretLigneModel();

	// Peuplement des différents champs
	newStopLine.arretId = d.arretId;
	newStopLine.ligneId = d.ligneId;
	newStopLine.arrival_time = d.arrival_time;
	newStopLine.departure_time = d.departure_time;
	newStopLine.stop_sequence = d.stop_sequence;
	newStopLine.pickup_type = d.pickup_type;
	newStopLine.drop_off_type = d.drop_off_type;
	newStopLine.timepoint = d.timepoint;
	newStopLine.compagnieId = d.compagnieId;

	// Insertion en base de données
	newStopLine.save(function(err) {
		if(err) {
			console.log('[ERREUR] Relation Arret / Ligne - SAVE');
			console.log(err);
			if(callback) callback(false);
		}
		else {
			console.log('[REUSSI] Relation Arret / Ligne - SAVE');
			if(callback) callback(true);
		}
	});
}
// Relation Arret / Ligne - Mise à jour
function updateStopLine(query, update, callback) {
	arretLigneModel.findOneAndUpdate(query, update, function(err, d) {
		if(err) {
			console.log('[ERREUR] Relation Arret / Ligne - UPDATE');
			console.log(err);
			if(callback) callback(false);
		}
		else {
			console.log('[ERREUR] Relation Arret / Ligne - UPDATE');
			if(callback) callback(true);
		}
	});
}
// Relation Arret / Ligne - Récupération
function selectStopsLines(query, callback) {
	arretLigneModel.find(query, function(err, d) {
		if(err) {
			console.log('[ERREUR] Relation Arret / Ligne - SELECT');
			console.log(err);
		}
		else
			console.log('[ERREUR] Relation Arret / Ligne - SELECT');

		if(callback) callback(err, d);
	});
}

// Vehicule - Création
function createVehicle(d, callback) {
	// Initialisation du nouveau véhicule
	var newVehicle = new vehiculeModel();

	// Peuplement des différents champs
	newVehicle.longitude = d.longitude;
	newVehicle.latitude = d.latitude;
	newVehicle.ligneId = d.ligneId;
	newVehicle.compagnieId = d.compagnieId;

	// Insertion en base de données
	newVehicle.save(function(err) {
		if(err) {
			console.log('[ERREUR] Vehicule - SAVE');
			console.log(err);
			if(callback) callback(false);
		}
		else {
			console.log('[REUSSI] Vehicule - SAVE');
			if(callback) callback(true);
		}
	});
}

// Vehicule - Mise à jour
function updateVehicle(query, update, callback) {
	vehiculeModel.findOneAndUpdate(query, update, function(err, d) {
		if(err) {
			console.log('[ERREUR] Vehicule - UPDATE');
			console.log(err);
			if(callback) callback(false);
		}
		else {
			console.log('[REUSSI] Vehicule - UPDATE');
			if(callback) callback(true);
		}
	});
}

// Vehicule - Récupération
function selectVehicles(query, callback) {
	vehiculeModel.find(query, function(err, d) {
		if(err) {
			console.log('[ERREUR] Vehicule - SELECT');
			console.log(err);
		}
		else
			console.log('[REUSSI] Vehicule - SELECT');

		if(callback) callback(err, d);
	});
}

/*
**	Fonctions supplémentaires
*/
// Recherche des arrêts à proximités
function searchStopsNearTo(point, distance, callback) {
	var arrets = [],
		lignes = [],
		arretsLignes = [];

	console.log('[INFO] Appel : Recherche des arrêts à proximités');

	arretModel.find({
		'location': {
			$nearSphere: {
				$geometry: {
					type : "Point",
					coordinates : [ point.latitude, point.longitude ]
				},
				$minDistance: 0,
				$maxDistance: distance
			}
		}
	}, function(err, arretsDuPoint) {
		if(err) {
			console.log('[ERREUR] Recherche des arrêts à proximités - Arrets');
			console.log(err);
		}
		else {
			console.log('[REUSSI] Recherche des arrêts à proximités (%d)', arretsDuPoint.length);
			
			for(var a=0; a<arretsDuPoint.length; a++) {
				arretLigneModel.find({'arretId': arretsDuPoint[a]._id}, function(err, arretLignes) {
					if(err) {
						console.log('[ERREUR] Recherche des arrêts à proximités - Arret / Ligne');
						console.log(err);
					}
					else {
						console.log('[REUSSI] Recherche des arrêts à proximités - Arret / Ligne');
						arretsLignes.push(arretLignes);

						for(var al=0; al<arretLignes.length; al++) {
							ligneModel.findOne({'_id': arretLignes[al].ligneId }, function(err, ligne) {
								if(err) {
									console.log('[ERREUR] Recherche des arrêts à proximités - Ligne');
									console.log(err);
								}
								else {
									console.log('[REUSSI] Recherche des arrêts à proximités - Ligne');
									lignes.push(ligne);

									if(lignes.length == arretLignes.length) {
										var lignesResultats = [];

					console.log('FIN')					
										for(var al1=0; al1<arretsLignes.length; al1++) {
											for(var al2=0; al2<arretsLignes[al1].length; al2++) {
												var ligneActuelleId = arretsLignes[al1][al2].ligneId;
console.log(' ');
console.log(arretsLignes[al1][al2]);
												for(var l1=0; l1<lignes.length; l1++) {
													//console.log(ligneActuelleId+' - '+lignes[l1]._id);

													if(arretsLignes[al1][al2].ligneId == lignes[l1]._id) {
														console.log('CORRESPONDANCE')
													}
												}
											}
										}
									}
								}
							});
						}
					}
				});
			}
		}

		//if(callback) callback(err, arrets);
	});
}



/*
**	Traitement des sockets
*/
// Nouvelle connexion de socket
io.on('connection', function(socket) {
	console.log('Client : connect');

	/*
	**	COMPAGNIE DE TRANSPORT
	*/
	// Sockets de base
	// Compagnie de transport - Création
	socket.on('createAgency', function(d, callback) {
		createAgency(d, callback);
	});

	// Compagnie de transport - Mise à jour
	socket.on('updateAgency', function(query, update, callback) {
		updateAgency(query, update, callback);
	});

	// Compagnie de transport - Récupération
	socket.on('selectAgencies', function(query, callback) {
		selectAgencies(query, callback);
	});

	// Socket supplémentaire
	/*
	**	Compagnie de transport - Login
	**		return [Boolean]
	**
	**	[Boolean] -> true  (Compagnie connectée)
	**	[Boolean] -> false (Compagnie non connectée)
	*/
	socket.on('loginAgency', function (email, pass, callback) {
		compagnieModel.findOne({ email: email }, function (err, agency) {
			if (!err && agency) {
				if (agency.verifyPasswordSync(pass)) {
					callback(true, agency);
				}
				else callback(false);
			}
			else {
				callback(false);
			}
		});
	});


	/*
	**	LIGNE
	*/
	// Sockets de base
	// Ligne - Création
	socket.on('createLine', function(d, callback) {
		createLine(d, callback);
	});

	// Ligne - Mise à jour
	socket.on('updateLine', function(query, update, callback) {
		updateLine(query, update, callback);
	});

	// Ligne - Récupération
	socket.on('selectLines', function(query, callback) {
		selectLines(query, callback);
	});


	/*
	**	ARRET
	*/
	// Sockets de base
	// Arret - Création
	socket.on('createStop', function(d, callback) {
		createStop(d, callback);
	});

	// Arret - Mise à jour
	socket.on('updateStop', function(query, update, callback) {
		updateStop(query, update, callback);
	});

	// Arret - Récupération
	socket.on('selectStops', function(query, callback) {
		selectStops(query, callback);
	});


	/*
	**	RELATION ARRET / LIGNE
	*/
	// Sockets de base
	// Relation Arret / Ligne - Création
	socket.on('createStopLine', function(d, callback) {
		createStopLine(d, callback);
	});

	// Relation Arret / Ligne - Mise à jour
	socket.on('updateStopLine', function(query, update, callback) {
		updateStopLine(query, update, callback);
	});

	// Relation Arret / Ligne - Récupération
	socket.on('selectStopsLines', function(query, callback) {
		selectStopsLines(query, callback);
	});


	/*
	**	VEHICULE
	*/
	// Sockets de base
	// Vehicule - Création
	socket.on('createVehicle', function(d, callback) {
		createVehicle(d, callback);
	});

	// Vehicule - Mise à jour
	socket.on('updateVehicle', function(query, update, callback) {
		updateVehicle(query, update, callback);
	});

	// Vehicule - Récupération
	socket.on('selectVehicles', function(query, callback) {
		selectVehicles(query, callback);
	});



	/*
	**	Récupération des arrets à proximité des coordonnées GPS du point, dans un périmètre donné
	**
	**		point = {
	**			latitude : ...,
	**			longitude : ...
	**		};
	**
	**		socket.emit('searchStopsNearTo', point, distance, callback);
	*/
	socket.on('searchStopsNearTo', function(point, distance, callback) {
		searchStopsNearTo(point, distance, callback);
	});

	/*
	**	Récupération des lignes d'après un itinéraire
	**
	**		points = [];
	**
	**		points[0] = {
	**			latitude : [Number],
	**			longitude : [Number]
	**		};
	**
	**
	**		points[n] = { ... };
	**
	**		socket.emit('searchRoutes', points, perimetre, callback);
	*/
	socket.on('searchRoutes', function(points, perimeter, callback) {
		console.log('Route request');

		var pointsItineraire = [],
			arretTmp;

		for(var p=0; p<points.length; p++) {
			var pointTmp = points[p];

			arretModel.find({
				'location': {
					$nearSphere: {
						$geometry: {
							type : "Point",
							coordinates : [ points[p].latitude, points[p].longitude ]
						},
						$minDistance: 0,
						$maxDistance: perimeter
					}
				}
			},  function(err, arretsDuPoint) {
				console.log(arretsDuPoint);
				pointTmp.arrets = [];

				if(!err) {
					// Récupération des lignes de chaque arrets
					for(var a=0; a<arretsDuPoint.length; a++) {
						arretTmp = arretsDuPoint[a];

						arretLigneModel.find({'arretId': arretTmp._id}, function(err, lignesPassantParArret) {
							if(!err) {
								for(var l=0; l<lignesPassantParArret.length; l++) {
									var lignes = [];


									ligneModel.findById(lignesPassantParArret[l].ligneId, function(err, ligne) {
										lignes.push(ligne);

										if(lignesPassantParArret.length == lignes.length) {
											arretTmp.lignes = lignes;
											pointTmp.arrets.push(arretTmp);
											pointsItineraire.push(pointTmp);

											if(pointsItineraire.length == points.length) {
												verifRoutes(pointsItineraire, function(err, d) {
													if(callback) callback(err, d);
												});
											}
										}
									});
								}
							}
						});

					}
				}
				else {
					if(callback) callback(err, null);
				}
			});
		}
	});
});

function verifRoutes(points, callback) {
	var routes = [];

	// Parcours des points du trajet
	for(var p=0; p<points.length-1; p++) {
		// Parcours des arrets du point i
		for(var a1=0; a1<points[p].arrets.length; a1++) {
			// Parcours des lignes de l'arrets a1 du point i
			for(var l1=0; l1<points[p].arrets[a1].lignes.length; l1++) {
				// Parcours des arrets du point i+1
				for(var a2=0; a2<points[p+1].arrets.length; a2++) {
					// Parcours des lignes de l'arret a2 du point i+1
					for(var l2=0; l2<points[p+1].arrets[a2].lignes.length; l2++) {
						var ligne1 = points[p].arrets[a1].lignes[l1],
							ligne2 = points[p+1].arrets[a2].lignes[l2];
						

						if(ligne1._id == ligne2._id) {
							routes.push({
								arrets: [points[p].arrets[a1], points[p+1].arrets[a2]],
								ligne: ligne1
							});
						}
					}
				}
			}
		}
	}

	if(callback) callback(null, routes);
}