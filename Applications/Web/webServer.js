var express = require('express'),
	socketServeurCentral = require('socket.io-client')('http://localhost:8008/'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io')(server),
	port = 8080;

server.listen(port, function() {
	console.log('Le serveur web écoute sur le port %d', port);
});

// Dossier contenant l'application web
app.use(express.static(__dirname + '/public'));

// Serveur de socket de l'application web
io.on('connection', function(socket) {
	console.log('Nouveau client');

	socket.on('request', function(requestType, request, callback) {
		console.log('Requete client');
		socketServeurCentral.emit('clientRequest', requestType, request, callback);
	});
});
