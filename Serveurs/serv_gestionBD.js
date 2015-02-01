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
	compagnieId : Schema.ObjectId
});

//	Schéma lien entre arret et ligne
var arretLigneSchema = new mongoose.Schema({
	arretId : Schema.ObjectId,
	ligneId : Schema.ObjectId
});

// Schéma des véhicule
var vehiculeSchema = new mongoose.Schema({
	longitude : Number,
	latitude : Number,
	ligneId : Schema.ObjectId,
	compagnieId : Schema.ObjectId,
	date : { type : Date, default : Date.now },
});

// Création des modèles associés
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
	**			email : "Agency email",
	**			password : "Agency password",
	**			agency_id : "..",
	**			agency_name : "..",
	**			agency_url : "..",
	**			agency_timezone : "..",
	**			agency_phone : "..",
	**			agency_lang : ".."
	**		});
	*/
	socket.on('createAgency', function(d) {
		// Initialisation de la nouvelle compagnie
		var newAgency = new compagnieModel();

		// Peuplement des différents champs
		newAgency.agency_id = d.agency_id;
		newAgency.agency_name = d.agency_name;
		newAgency.agency_url = d.agency_url;
		newAgency.agency_timezone = d.agency_timezone;
		newAgency.agency_phone = d.agency_timezone;
		newAgency.angency_lang = d.angency_lang;
		newAgency.email = d.email;
		newAgency.password = d.password;

		// Insertion en base de données
		newAgency.save(function(err) {
			if(err)
				console.log('Database Agency creation : false');
			else
				console.log('Database Agency creation : true');
		});
	});

	/*
	**	Mise à jour d'une compagnie
	**
	**		query = {
	**			email : "Agency email",
	**			password : "Agency password",
	**			agency_id : "..",
	**			agency_name : "..",
	**			agency_url : "..",
	**			agency_timezone : "..",
	**			agency_phone : "..",
	**			agency_lang : ".."
	**		}
	**		update = {
	**			email : "Agency email",
	**			password : "Agency password",
	**			agency_id : "..",
	**			agency_name : "..",
	**			agency_url : "..",
	**			agency_timezone : "..",
	**			agency_phone : "..",
	**			agency_lang : ".."
	**		}
	**
	**		socket.emit('updateAgency', query, update);
	*/
	socket.on('updateAgency', function(query, update) {
		compagnieModel.findOneAndUpdate(query, update, function(err, compagnie) {
			if(err)
				console.log('Database Agency update : false');
			else
				console.log('Database Agency update : true');
		});
	});

	/*
	**	Récupération des compagnies
	**
	**		query = {
	**			email : "Agency email",
	**			password : "Agency password",
	**			agency_id : "..",
	**			agency_name : "..",
	**			agency_url : "..",
	**			agency_timezone : "..",
	**			agency_phone : "..",
	**			agency_lang : ".."
	**		}
	**
	**		socket.emit('updateAgencies', query, callback);
	*/
	socket.on('selectAgencies', function(query, callback) {
		compagnieModel.find(query, function(err, d) {
			if(err)
				console.log('Database Agency select : false');
			else
				console.log('Database Agency select : true');
			callback(err, d);
		});
	});

});
