var async = require('async'),
port = 9009, // Port d'écoute des sockets
io = require('socket.io')(port), // Socket.IO pour la communication entre serveurs
_ = require('underscore'),
color = require('colors'),
clientGestBD = require('socket.io-client')('http://192.168.0.25:7007/', {'reconnection' : true, 'reconnectionDelay' : 2000, reconnectionDelayMax : 100000 });

clientGestBD.on('connect', function(){ console.info("Connecté au serveur de la base de donnée.".green); clientGestBD.connecte = true; });
clientGestBD.on('event', function(data){ console.log(data); });
clientGestBD.on('disconnect', function(){ console.error("Déconnecté du serveur de la base de donnée.".red); clientGestBD.connecte = false; });
clientGestBD.on('reconnecting', function(n) { console.info("Reconnexion en cours (".yellow + n + ") ...".yellow); });
clientGestBD.on('reconnect_error', function() { console.error("Reconnexion échouée".red);});
clientGestBD.on('reconnect_failed', function() { console.error("Reconnexion impossible.".red); });



//Tableau qui contiens tous les noms de fichiers du protocole GTFS ()
var GTFSFiles = [	'agency'
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
    	console.log("Demande d'inscription de l'agence : ".blue + Agencie.name.grey);
    	console.log("Url GTFS : ".blue + Agencie.urlGTFS.grey);
    	console.log("Url Siri : ".blue + Agencie.urlSIRI.grey);
    	console.log("Email : ".blue + Agencie.email.grey);
    	console.log("Url GTFS : ".blue + Agencie.adress.grey);
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
    				console.info("Récupération des arrets OK".green)
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


function downloadGTFS(name, url) {
	log('Starting ' + url);
	async.series([
			cleanupFiles,
			downloadFiles,
			removeDatabase,
			importFiles,
			postProcess,
			cleanupFiles
		], function(e, results){
			log( e || url  + ': Completed');
			cb();
	});
}
function cleanupFiles(cb) {
	//remove old downloaded file
	exec( (process.platform.match(/^win/) ? 'rmdir /Q /S ' : 'rm -rf ') + downloadDir, function(e, stdout, stderr) {
		try {
			//create downloads directory
			fs.mkdirSync(downloadDir);
			cb();
		} catch(e) {
			if(e.code == 'EEXIST') {
			cb();
			} else {
				handleError(e);
			}
		}
	});
}
function downloadFiles(cb) {
	//do download
	// update implementation to allow download from local filesystem, to allow testable code
	//On parse l'URL et on vérifie que le protocole est bien http ou https, sinon on essaye de récuperer le fichier
	//sur le système local
	var file_protocol = require('url').parse(agency_url)['protocol']; 
	if (file_protocol === 'http:' || file_protocol === 'https:') {
		request(agency_url, processFile).pipe(fs.createWriteStream(downloadDir + '/latest.zip'));

		function processFile(e, response, body){
			if(response && response.statusCode != 200){ cb(new Error('Couldn\'t download function() {};iles')); }
			log(agency_key + ': Download successful');

			fs.createReadStream(downloadDir + '/latest.zip')
			.pipe(unzip.Extract({ path: downloadDir }).on('close', cb))
			.on('error', handleError);
		}
	} else {
		if (!fs.existsSync(agency_url)) return cb(new Error('File does not exists'));
		fs.createReadStream(agency_url)
			.pipe(fs.createWriteStream(downloadDir + '/latest.zip'))
			.on('close', function(){
					fs.createReadStream(downloadDir + '/latest.zip')
					.pipe(unzip.Extract({ path: downloadDir }).on('close', cb))
					.on('error', handleError);
				}
			)
			.on('error', handleError);
	}
}
