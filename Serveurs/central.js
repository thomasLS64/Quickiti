var port = 8008, // Port d'écoute des sockets
    io = require('socket.io')(port); // socket.io pour la communication entre serveurs

// Connexion au Serveur de gestion de la BD
var serverGestionBD = io.connect('http://localhost:7007');

// Se connecte au Serveur de récupération de données
var serveurRecuperationDonnees = io.connect('http://localhost:9009');

/*
// Se connecte au Serveur client web
var socket = io.connect('http://localhost:80');
Car c'est au client de se connecter
*/


// Quand un client se connecte en appellant la fonction con, ici le serveur site client et pour le site pour les compagnies 
io.sockets.on('connection', function (socket, callback) { // socket pour avoir une instance différente pour chaque seveur
    /* lorsque la fonction "clientRequest" est appelé depuis le site client
    ** 
    ** description des paramètres de la fonction:
    ** socket.on('clientRequest', function (requestType, request, perimeter){ ..});
    ** 
    ** var requestType = 'route' or 'stopsNearTo';
    ** var request = { coordOne = {
    **                      latitude : "..",
    **                      longitude : ".."},
    **                 coordSecond = {..}
    **               }
    ** var perimeter = 15; l'unité est 
    ** 
    */
    socket.on('clientRequest', function (requestType, request, perimeter, callback){ 

        // Initialisation de la réponse
        var reponseFinal = false;

        // Vérification du type de requete
        if(requestType == 'route') {
            // demande à la base de donnée de calculé l'itinéraire et les informations stocké correspondantes
            serverGestionBD.emit('searchRoute',
                                                {request = request,
                                                 perimeter = perimeter},
                                                function (etat, routes){
                if(etat){

                    /*
                    ** description des paramètres de la fonction:
                    ** serveurRecuperationDonnees.emit('searchRealTime',
                    **                                 {routes : routes},
                    **                                 function (etat, routesRealTime){});
                    ** 
                    ** var routes = { route1{..}, route2{..}, .. , routeN{..} }
                    ** var route = { stopStart{..}, stopEnd{..} }
                    ** var stopStart = { stopStartAgency1{..}, stopStartAgency2{..}, .. , stopStartAgencyN }
                    ** var stopEnd est similaire à stopStart 
                    ** var stopStartAgency = { line1{..}, line2{..}, .. , lineN{..} } // agence de l'arrêt de départ
                    ** var line = { time1 , time2, .. , timeN} // avec (timeN-time1 < 5) heures par exemple
                    **
                    */
                    serveurRecuperationDonnees.emit('searchRoutesRealTime',
                                                    {routes : routes},
                                                    function (etat, routesRealTime){
                        if(etat){
                            if(callback) callback(etat, routesRealTime);
                        }
                        else{
                            if(callback) callback(etat, routes);
                        }
                    });
                }
                else {
                    console.log('Erreur dans la recuperation de l itineraire')
                }
            });
        }
        else if(requestType == 'stopsNearTo'){
            // demande à la base de donnée de calculé les arrêts à proximités et les informations stocké correspondantes
            serverGestionBD.emit('searchStopsNearTo',
                                                {request = request,
                                                 perimeter = perimeter},
                                                function (etat, stopsNearTo){
                if(etat){

                    /*
                    ** description des paramètres de la fonction:
                    ** serveurRecuperationDonnees.emit('searchStopsNearTo',
                    **                                 {routes : routes},
                    **                                 function (etat, stopsNearToRealTime){});
                    ** 
                    ** var stopsNearTo = { stop1{..}, stop2{..}, .. , stopN{..} }
                    ** var stopS = { stopAgency1{..}, stopAgency2{..}, .. , stopAgencyN }
                    ** var stopStartAgency = { line1{..}, line2{..}, .. , lineN{..} } // agence de l'arrêt de départ
                    ** var line = { time1 , time2, .. , timeN} // avec (timeN-time1 < 5) heures par exemple
                    **
                    */
                    serveurRecuperationDonnees.emit('searchStopsNearToRealTime',
                                                    {routes : routes},
                                                    function (etat, stopsNearToRealTime){
                        if(etat){
                            if(callback) callback(etat, stopsNearToRealTime);
                        }
                        else{
                            if(callback) callback(etat, stopsNearTo);
                        }
                    });
                }
                else {
                    console.log('Erreur dans la recuperation de l itineraire')
                }
            });
        }
        else{
            console.log('La fonctionnalite  ' requestType '  n pas encore ete developpe');
        }            
});
