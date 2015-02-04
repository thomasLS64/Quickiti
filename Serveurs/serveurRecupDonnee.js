var async = require('async'),
port = 9009, // Port d'écoute des sockets
io = require('socket.io')(port), // Socket.IO pour la communication entre serveurs
_ = require('underscore');
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
	socket.emmit()
    socket.on('requestGTFS', function(url) {
        var nomFichierGTFS = downloadGTFS(url, socket);
        socket.emmit(GTFS2JSON(nomFichierGTFS));

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
