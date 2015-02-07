var port = 7007, // Port d'écoute des sockets
	io = require('socket.io')(port), // Socket.IO pour la communication entre serveurs
	mongoose = require('mongoose'), // ODM pour MongoDB
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
	password : String
});

//	Schéma d'une ligne
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

//	Schéma d'un arret
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

//	Schéma lien entre arret et ligne
var arretLigneSchema = new mongoose.Schema({
	arretId : Schema.ObjectId,
	ligneId : Schema.ObjectId
});

//	Schéma des véhicules
var vehiculeSchema = new mongoose.Schema({
	longitude : Number,
	latitude : Number,
	ligneId : Schema.ObjectId,
	compagnieId : Schema.ObjectId,
	date : { type : Date, default : Date.now },
});

// Création des modèles associés aux schémas
var compagnieModel = mongoose.model('compagnie', compagnieSchema);
var ligneModel = mongoose.model('ligne', ligneSchema);
var arretModel = mongoose.model('arret', arretSchema);
var arretLigneModel = mongoose.model('arretLigne', arretLigneSchema);
var vehiculeModel = mongoose.model('vehicule', vehiculeSchema);


/*
**	Traitement des sockets
*/
// Nouvelle connexion de socket
io.on('connection', function(socket) {
	/*
	**	Compagnie de transport
	**	----------------------
	**
	**	Création d'une compagnie
	**
	**		socket.emit('createAgency', {
	**			email : "...",
	**			password : "...",
	**			agency_id : "...",
	**			agency_name : "...",
	**			agency_url : "...",
	**			agency_timezone : "...",
	**			agency_phone : "...",
	**			agency_lang : "..."
	**		});
	*/
	socket.on('createAgency', function(d, callback) {
		// Initialisation de la nouvelle compagnie
		var newAgency = new compagnieModel();

		// Peuplement des différents champs
		newAgency.agency_id = d.agency_id;
		newAgency.agency_name = d.agency_name;
		newAgency.agency_url = d.agency_url;
		newAgency.agency_timezone = d.agency_timezone;
		newAgency.agency_phone = d.agency_timezone;
		newAgency.agency_lang = d.agency_lang;
		newAgency.email = d.email;
		newAgency.password = d.password;

		// Insertion en base de données
		newAgency.save(function(err) {
			if(err) {
				console.log('Database Agency creation : false');
				if(callback) callback(false);
			}
			else {
				console.log('Database Agency creation : true');
				if(callback) callback(true);
			}
		});
	});

	/*
	**	Mise à jour d'une compagnie
	**
	**		query = {
	**			email : "...",
	**			password : "...",
	**			agency_id : "...",
	**			agency_name : "...",
	**			agency_url : "...",
	**			agency_timezone : "...",
	**			agency_phone : "...",
	**			agency_lang : "..."
	**		}
	**		update = {
	**			email : "...",
	**			password : "...",
	**			agency_id : "...",
	**			agency_name : "...",
	**			agency_url : "...",
	**			agency_timezone : "...",
	**			agency_phone : "...",
	**			agency_lang : "..."
	**		}
	**
	**		socket.emit('updateAgency', query, update);
	*/
	socket.on('updateAgency', function(query, update, callback) {
		compagnieModel.findOneAndUpdate(query, update, function(err, d) {
			if(err) {
				console.log('Database Agency update : false');
				if(callback) callback(false);
			}
			else {
				console.log('Database Agency update : true');
				if(callback) callback(true);
			}
		});
	});

	/*
	**	Récupération des compagnies
	**
	**		query = {
	**			email : "...",
	**			password : "...",
	**			agency_id : "...",
	**			agency_name : "...",
	**			agency_url : "...",
	**			agency_timezone : "...",
	**			agency_phone : "...",
	**			agency_lang : "..."
	**		}
	**
	**		socket.emit('selectAgencies', query, callback);
	*/
	socket.on('selectAgencies', function(query, callback) {
		compagnieModel.find(query, function(err, d) {
			if(err)
				console.log('Database Agencies select : false');
			else
				console.log('Database Agencies select : true');
			if(callback) callback(err, d);
		});
	});


	/*
	**	Ligne
	**	----------------------
	**
	**	Création d'une ligne
	**
	**		socket.emit('createLine', {
	**			route_id : "...",
	**			route_short_name : "...",
	**			route_long_name : "...",
	**			route_desc : "...",
	**			route_type : "...",
	**			service_id : "...",
	**			trip_id : "...",
	**			trip_headsign : "...",
	**			compagnieId : "..."
	**		});
	*/
	socket.on('createLine', function(d, callback) {
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
				console.log('Database Line creation : false');
				if(callback) callback(false);
			}
			else {
				console.log('Database Line creation : true');
				if(callback) callback(true);
			}
		});
	});

	/*
	**	Mise à jour d'une ligne
	**
	**		query = {
	**			route_id : "...",
	**			route_short_name : "...",
	**			route_long_name : "...",
	**			route_desc : "...",
	**			route_type : "...",
	**			service_id : "...",
	**			trip_id : "...",
	**			trip_headsign : "...",
	**			compagnieId : "..."
	**		}
	**		update = {
	**			route_id : "...",
	**			route_short_name : "...",
	**			route_long_name : "...",
	**			route_desc : "...",
	**			route_type : "...",
	**			service_id : "...",
	**			trip_id : "...",
	**			trip_headsign : "...",
	**			compagnieId : "..."
	**		}
	**
	**		socket.emit('updateLine', query, update);
	*/
	socket.on('updateLine', function(query, update, callback) {
		ligneModel.findOneAndUpdate(query, update, function(err, d) {
			if(err) {
				console.log('Database Line update : false');
				if(callback) callback(false);
			}
			else {
				console.log('Database Line update : true');
				if(callback) callback(true);
			}
		});
	});

	/*
	**	Récupération des lignes
	**
	**		query = {
	**			route_id : "...",
	**			route_short_name : "...",
	**			route_long_name : "...",
	**			route_desc : "...",
	**			route_type : "...",
	**			service_id : "...",
	**			trip_id : "...",
	**			trip_headsign : "...",
	**			compagnieId : "..."
	**		}
	**
	**		socket.emit('selectLines', query, callback);
	*/
	socket.on('selectLines', function(query, callback) {
		ligneModel.find(query, function(err, d) {
			if(err)
				console.log('Database Lines select : false');
			else
				console.log('Database Lines select : true');
			if(callback) callback(err, d);
		});
	});


	/*
	**	Arret
	**	----------------------
	**
	**	Création d'un arret
	**
	**		socket.emit('createStop', {
	**			stop_id : "...",
	**			stop_name : "...",
	**			stop_desc : "...",
	**			stop_lat : "...",
	**			stop_lon : "...",
	**			stop_url : "...",
	**			location_type : "...",
	**			compagnieId : "..."
	**		});
	*/
	socket.on('createStop', function(d, callback) {
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
				console.log('Database Stop creation : false');
				if(callback) callback(false);
			}
			else {
				console.log('Database Stop creation : true');
				if(callback) callback(true);
			}
		});
	});

	/*
	**	Mise à jour d'un arret
	**
	**		query = {
	**			stop_id : "...",
	**			stop_name : "...",
	**			stop_desc : "...",
	**			stop_lat : "...",
	**			stop_lon : "...",
	**			stop_url : "...",
	**			location_type : "...",
	**			compagnieId : "..."
	**		}
	**		update = {
	**			stop_id : "...",
	**			stop_name : "...",
	**			stop_desc : "...",
	**			stop_lat : "...",
	**			stop_lon : "...",
	**			stop_url : "...",
	**			location_type : "...",
	**			compagnieId : "..."
	**		}
	**
	**		socket.emit('updateStop', query, update);
	*/
	socket.on('updateStop', function(query, update, callback) {
		arretModel.findOneAndUpdate(query, update, function(err, d) {
			if(err) {
				console.log('Database Stop update : false');
				if(callback) callback(false);
			}
			else {
				console.log('Database Stop update : true');
				if(callback) callback(true);
			}
		});
	});

	/*
	**	Récupération des arrets
	**
	**		query = {
	**			stop_id : "...",
	**			stop_name : "...",
	**			stop_desc : "...",
	**			stop_lat : "...",
	**			stop_lon : "...",
	**			stop_url : "...",
	**			location_type : "...",
	**			compagnieId : "..."
	**		}
	**
	**		socket.emit('selectStops', query, callback);
	*/
	socket.on('selectStops', function(query, callback) {
		arretModel.find(query, function(err, d) {
			if(err)
				console.log('Database Stop select : false');
			else
				console.log('Database Stop select : true');
			if(callback) callback(err, d);
		});
	});

	/*
	**	Récupération des arrets selon ses coordonnées GPS et un périmètre
	**
	**		point = {
	**			latitude : ...,
	**			longitude : ...
	**		};
	**
	**		socket.emit('searchStopsNearTo', point, distance, callback);
	*/
	socket.on('searchStopsNearTo', function(point, distance, callback) {
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
		}, function(err, d) {
			if(callback) callback(err, d);
		});
	});


	/*
	**	Arret et Ligne
	**	----------------------
	**
	**	Création d'un lien entre arret et ligne
	**
	**		socket.emit('createStopLine', {
	**			arretId : "...",
	**			ligneId : "..."
	**		});
	*/
	socket.on('createStopLine', function(d, callback) {
		// Initialisation du nouveau lien
		var newStopLine = new arretLigneModel();

		// Peuplement des différents champs
		newStop.arretId = d.arretId;
		newStop.ligneId = d.ligneId;

		// Insertion en base de données
		newStop.save(function(err) {
			if(err) {
				console.log('Database link between Stop & Line creation : false');
				if(callback) callback(false);
			}
			else {
				console.log('Database link between Stop & Line creation : true');
				if(callback) callback(true);
			}
		});
	});

	/*
	**	Mise à jour d'un lien entre arret et ligne
	**
	**		query = {
	**			arretId : "...",
	**			ligneId : "..."
	**		}
	**		update = {
	**			arretId : "...",
	**			ligneId : "..."
	**		}
	**
	**		socket.emit('updateStopLine', query, update);
	*/
	socket.on('updateStopLine', function(query, update, callback) {
		arretLigneModel.findOneAndUpdate(query, update, function(err, d) {
			if(err) {
				console.log('Database link between Stop & Line update : false');
				if(callback) callback(false);
			}
			else {
				console.log('Database link between Stop & Line update : true');
				if(callback) callback(true);
			}
		});
	});

	/*
	**	Récupération des lien entre arrets et lignes
	**
	**		query = {
	**			arretId : "...",
	**			ligneId : "..."
	**		}
	**
	**		socket.emit('selectStopsLines', query, callback);
	*/
	socket.on('selectStopsLines', function(query, callback) {
		arretLigneModel.find(query, function(err, d) {
			if(err)
				console.log('Database link between Stop & Line select : false');
			else
				console.log('Database link between Stop & Line select : true');
			if(callback) callback(err, d);
		});
	});


	/*
	**	Véhicule
	**	----------------------
	**
	**	Création d'un véhicule
	**
	**		socket.emit('createVehicle', {
	**			longitude = "...",
	**			latitude = "...",
	**			ligneId = "...",
	**			compagnieId = "..."
	**		});
	*/
	socket.on('createVehicle', function(d, callback) {
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
				console.log('Database Vehicle creation : false');
				if(callback) callback(false);
			}
			else {
				console.log('Database Vehicle creation : true');
				if(callback) callback(true);
			}
		});
	});

	/*
	**	Mise à jour d'un véhicule
	**
	**		query = {
	**			longitude = "...",
	**			latitude = "...",
	**			ligneId = "...",
	**			compagnieId = "..."
	**		}
	**		update = {
	**			longitude = "...",
	**			latitude = "...",
	**			ligneId = "...",
	**			compagnieId = "..."
	**		}
	**
	**		socket.emit('updateVehicle', query, update);
	*/
	socket.on('updateVehicle', function(query, update, callback) {
		vehiculeModel.findOneAndUpdate(query, update, function(err, d) {
			if(err) {
				console.log('Database Vehicle update : false');
				if(callback) callback(false);
			}
			else {
				console.log('Database Vehicle update : true');
				if(callback) callback(true);
			}
		});
	});

	/*
	**	Récupération des véhicules
	**
	**		query = {
	**			longitude = "...",
	**			latitude = "...",
	**			ligneId = "...",
	**			compagnieId = "..."
	**		}
	**
	**		socket.emit('selectVehicles', query, callback);
	*/
	socket.on('selectVehicles', function(query, callback) {
		vehiculeModel.find(query, function(err, d) {
			if(err)
				console.log('Database Vehicle select : false');
			else
				console.log('Database Vehicle select : true');
			if(callback) callback(err, d);
		});
	});
});
