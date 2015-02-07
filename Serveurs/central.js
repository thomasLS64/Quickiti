var port = 8008, // Port d'écoute des sockets
    io = require('socket.io')(port); // socket.io pour la communication entre serveurs

// Connexion au Serveur de gestion de la BD
var serveurGestionBD = io.connect('http://localhost:7007');

// Se connecte au Serveur de récupération de données
var socketRecuperationDonnees = io.connect('http://localhost:9009');

/*
// Se connecte au Serveur client web
var socket = io.connect('http://localhost:80');
Car c'est au client de se connecter
*/


// Quand un client se connecte, ici le serveur web
io.sockets.on('connection', function (socketWeb) { // socket pour avoir une instance différente..utile?
    socket.on('demanderClient', function(typeDemande, demande, perimetre){
        // Initialisation de la réponse
        var reponseFinal = false;

        // Vérification du type de requette
        if (typeDemande == 'itineraire') {
            // initialisation variable
            var ligne;

            // demande la liste des lignes au Serveur de récupération de données
            var itineraire = socketRecuperationDonnees.emit('recuperationItineraire', demande, perimetre, function(etat, lignes){
                if(etat){
                    // Parcours des différentes lignes reçu
                    for (var i = 0; i < lignes.length; i++) {
                        ligne = lignes[i];
                        if (ligne.tempsReel == 'tempsReel') {
                            reponseFinal += ligne;
                        } 
                        else{
                            serveurGestionBD.emit('horaireLigne', ligne, function(etat, horaires) {
                                if(etat){
                                    if (horaires.length > 0) {
                                        reponseFinal += ligne; // + quoi ?
                                        } 
                                    else{
                                        serveurGestionBD.emit('compagnieLigne',ligne, function(compagnie){
                                            if (compagnie) {
                                                reponseFinal += ligne + caracteristiques; // "caracteristiques" sort d'où ?
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }
                }
            } 
        });
            
            
        else{
            // initialisation variable
            var ligne;

            // demande la liste des lignes au Serveur de récupération de données
            var lignes = socketRecuperationDonnees.emit('recuperationArret', demande, perimetre, function(lignes));
            
            // Parcours des différentes lignes reçu
            for (var i = 0; i < lignes.length; i++) {
                ligne = lignes[i];
                if (ligne.tempsReel == 'tempsReel') {
                    reponseFinal += ligne;
                } 
                else{
                    var horaires = serveurGestionBD.emit('horaireLigne', ligne, function(horaires){
                        if (horaires.length > 0) {
                            reponseFinal += ligne; // + quoi ?
                        } 
                        else{
                            // Récupération des informations d'une compagnie
                            console.log('Sélection des compagnies');
                            serveurGestionBD.emit('selectAgencies', {
                                    "agency_lang" : "fr"
                            }, function(err, compagnie) {
                                    console.log(compagnie);
                                    if (compagnie) {
                                        reponseFinal += ligne + caracteristiques; // "caracteristiques" sort d'où ?
                                    }
                            });
                            
                        }
                    });
                    
                }
            };
        };
    })

    
});
