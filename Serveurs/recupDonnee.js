var async = require('async'),
port = 9009, // Port d'écoute des sockets
io = require('socket.io')(port), // Socket.IO pour la communication entre serveurs
_ = require('underscore'),
color = require('colors'),
clientGestBD = require('socket.io-client')('http://192.168.1.56:7007/', {'reconnection' : true, 'reconnectionDelay' : 2000, reconnectionDelayMax : 100000 });

clientGestBD.on('connect', function(){ console.info("Connecté au serveur de la base de donnée.".green); clientGestBD.connecte = true; });
clientGestBD.on('event', function(data){ console.log(data); });
clientGestBD.on('disconnect', function(){ console.error("Déconnecté du serveur de la base de donnée.".red); clientGestBD.connecte = false; });
clientGestBD.on('reconnecting', function(n) { console.info("Reconnexion en cours (" + n + ") ...".orange);});
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
    socket.on('subscribeAgencies', function (Agencie) {
    	console.log("------------------------------".bold);
    	console.log("Demande d'inscription de l'agence" + Agencie.name);
    	console.log("------------------------------".bold);
    });
    socket.on("requestPerimeter", function (point, perimeter) {
    	console.log("------------------------------".bold);
    	console.log("Demande de périmetre reçue.".purple)
    	if (!clientGestBD.connecte) {
    		socket.emmit("requestPerimeter", { error: 1 });
    		console.log("On est déconnecté du serveur de gestion de la bdd.".red);
    	}
    	else {
    		console.log("Connexion à la bdd OK".green);
    		clientGestBD.emmit('searchStop', { point: point, perimeter: perimeter }, function (result) { 
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
    		});
    	}
    	console.log("------------------------------".bold);
    });

});


function downloadGTFS(url) {
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
