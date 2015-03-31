var port = 8008, // Port d'écoute des sockets
    io = require('socket.io')(port); // socket.io pour la communication entre serveurs

// Connexion au Serveur de gestion de la BD
var serverGestionBD =  require('socket.io-client')('http://localhost:7007/');//, { reconnection : true, reconnectionDelay : 2000, reconnectionDelayMax : 100000 })

// Se connecte au Serveur de récupération de données
var serveurRecuperationDonnees =  require('socket.io-client')('http://localhost:9009/');//, { reconnection : true, reconnectionDelay : 2000, reconnectionDelayMax : 100000 })

/*
// Se connecte au Serveur client web
var socket = io.connect('http://localhost:80');
Car c'est au client de se connecter
*/


// Quand un client se connecte en appellant la fonction con, ici le serveur site client et pour le site pour les compagnies 
io.on('connection', function (socket) { // socket pour avoir une instance différente pour chaque seveur
    console.log('Connexion client');
    /* lorsque la fonction "clientRequest" est appelé depuis le site client
     **
     ** description des paramètres de la fonction:
     ** socket.on('clientRequest', function (requestType, request, perimeter){ ..});
     **
     ** var requestType = 'route' or 'stopsNearTo';
     ** var request = [ coordOne = [
     **                      latitude : "..",
     **                      longitude : ".."],
     **                 coordSecond = [..]
     **               ]
     ** La variable request possède un ou deux points de coordonnée
     **     en fonction du type de la requète.
     ** var perimeter = 15; l'unité est
     **
     */
    socket.on('clientRequest', function (requestType, request, callback) {
        console.log('un serveur client s\'est connecté');
        // Initialisation de la réponse
        var reponseFinal = false;

        // Vérification du type de requete
        if (requestType == 'route') {
            console.log('La requète demandé est un itinéraire, envoie de la recherche à la BD');
            // demande à la base de donnée de calculé l'itinéraire et les informations stocké correspondantes
            serverGestionBD.emit('searchRoutes', request[0], request[1],
                function (err, routes) {
                    if(!err) {
                        if(routes.length > 0) {
                            console.log('Le ou les itinéraires sont reçus');

                            /*
                             ** description des paramètres de la fonction:
                             ** serveurRecuperationDonnees.emit('searchRealTime',
                             **                                 {routes : routes},
                             **                                 function (err, routesRealTime){});
                             **
                             ** var routes = [ route1[..], route2[..], .. , routeN[..] ]
                             ** var route = [ stopStart[..], stopEnd[..] ]
                             ** var stopStart = [ stopStartAgency1[..], stopStartAgency2[..], .. , stopStartAgencyN ]
                             ** var stopEnd est similaire à stopStart
                             ** var stopStartAgency = [ line1[..], line2[..], .. , lineN[..] ] // agence de l'arrêt de départ
                             ** var line = [ (time1, vehicul1[..]), (time2, vehicul1[..]), .. , (timeN} // avec (timeN-time1 < 5) heures par exemple
                             ** je sais pas trop comment intégrer les véhicule
                             */

                            // Demande des horaires en temps réel au serveur de récupération de données
                            serveurRecuperationDonnees.emit('searchRoutesRealTime', routes,
                                function (err, routesRealTime) {
                                    if(!err) {
                                        console.log('Le temps réel est obtenu ou partiellement, callback des itinéraires reçus par le serveur de récupération de données');
                                        // horaires obtenu en temps réel ou partiellement en temps réel
                                        if (callback) callback(err, routesRealTime);
                                    }
                                    else {
                                        console.log('Pas de temps réel, callback des itinéraires reçus par le SGBD');
                                        // horaires prévu par la compagnie
                                        if (callback) callback(err, routes);
                                    }
                                }
                            );
                        }
                        else {
                            console.log('Aucun itinéraire n\'a été trouvé');
                            if(callback) callback(err, routes);
                        }
                    }
                    else {
                        // Il y a eu une erreur lors de la récupération de l'itinéraire
                        console.log('Erreur dans la récuperation de l\'itineraire');
                        if (callback) callback(err);
                    }
                });
        }
        else if (requestType == 'stopsNearTo') {
            console.log('La requète demandée est une recherche sur un lieu, envoie de la recherche à la BD');

            // demande à la base de donnée de calculé les arrêts à proximités et les informations stocké correspondantes
            serverGestionBD.emit('searchStopsNearTo', request[0], request[1],
                function (err, stopsNearTo) {
                    if (!err) {
                        if(stopsNearTo.length > 0) {
                            console.log('Réception des arrêts à proximités');

                            /*
                             ** description des paramètres de la fonction:
                             ** serveurRecuperationDonnees.emit('searchStopsNearTo',
                             **                                 {routes : routes},
                             **                                 function (err, stopsNearToRealTime){});
                             **
                             ** var stopsNearTo = [ stop1[..], stop2[..], .. , stopN[..] ]
                             ** var stopS = [ stopAgency1[..], stopAgency2[..], .. , stopAgencyN ]
                             ** var stopStartAgency = [ line1[..], line2[..], .. , lineN[..] ] // agence de l'arrêt de départ
                             ** var line = [ time1 , time2, .. , timeN] // avec (timeN-time1 < 5) heures par exemple
                             **
                             */

                            // Demande des horaires en temps réel au serveur de récupération de données pour les arrêts
                            serveurRecuperationDonnees.emit('searchStopsNearToRealTime', stopsNearTo,
                                function (err, stopsNearToRealTime) {
                                    if(!err) {
                                        console.log('Le temps réel est obtenu ou partiellement, callback des arrêts reçus par le serveur de récupération de données');
                                        // horaires obtenu en temps réel ou partiellement en temps réel
                                        if (callback) callback(null, stopsNearToRealTime);
                                    }
                                    else {
                                        console.log('Pas de temps réel, callback des arrêts reçus par le SGBD');
                                        // horaires prévu par la compagnie
                                        if (callback) callback(err, stopsNearTo);
                                    }
                                });
                        }
                        else {
                            console.log('Aucun arrêt n\'a été trouvé');
                            if(callback) callback(err, null);
                        }
                    }
                    else {
                        // il y a eu une erreur dans la récupération des arrêts
                        console.log('Erreur dans la récuperation des arrêts');
                        if (callback) callback(err, null);
                    }
                }
            );
        }
        else {
            // le type de requete n'existe pas ou n'est pas encore implémenté
            console.log('La fonctionnalité  ' + requestType + '  n\'pas encore été développée');
            if (callback) callback(err, null);
        }
    });
});