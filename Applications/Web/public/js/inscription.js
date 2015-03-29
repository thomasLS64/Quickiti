/*
    Fonction qui sera appellée pour afficher à l'utilisateur l'état de traitement du formulaire
*/
function affMessage(message) {
    var divMess = document.getElementById("messageInfo");
    divMess.classList.remove("hidden");
    divMess.innerHTML = message;
}
//Connexion au serveur web
socketWebServer = io("http://127.0.0.1:8080");
//Evenement qui se déclanche quand la page est chargée
document.addEventListener("DOMContentLoaded", function () {
    //Evenement qui se déclanche quand on valide le formulaire
    document.getElementById("formInscription").addEventListener("submit", function (event) {
        //On arrête la propagation de l'evenement de l'envoi du formulaire et on empèche le navigateur d'agir
        event.preventDefault();
        //On informe l'utilisateur qu'on envoi le formulaire
        affMessage("Envoi du formulaire...");
        //On créer un objet qui contient toutes les informations du formulaire
        var objForm = {
            infoGenerales: {
                raisSocial: this.getElementById("inputRS").value,
                email: this.getElementById("inputEmail").value,
                motDePasse: this.getElementById("inputPass").value,
                pays: this.getElementById('selectPays').value,
                adresse: this.getElementById("inputAddr").value,
                codePostal: this.getElementById('inputCP').value
            },
            gtfs: {
                zipGTFS: this.getElementById('inputRS').value,
                BoolUseRealTime: this.getElementById('inputUseRealTime').checked,
                addrGTFSTripUpdate: this.getElementById('inputGTFSRealTimeTripUpdate').value,
                addrGTFSAlert: this.getElementById('inputGTFSRealTimeAlert').value,
                addrGTFSVehiclePosition: this.getElementById('inputGTFSRealVehiclePosition').value
            }
        };
        //On envoi l'objet au serveur web
        socketWebServer.emit("inscription", objForm, affMessage);
    });
    //Évènement qui se déclanche quand on perd le focus du champs de code postale
    document.getElementById("inputCP").addEventListener('blur', function () {
        //Si le code postale fait moins de deux caractère, on fait rien
        if (this.value.length < 2) return true;
        var pays = document.getElementById("selectPays");
        //Sinon on envoi au serveur web une requête pour chercher le code postale en fonction du pays
        //renseigné par l'utilisateur
        socketWebServer.emit('chercheCPVille', this.value, pays.value, function (results) {
            //Quand on a les résultats, on récupère le noeud DOM du champs pour sélectionner la ville, et on y met
            //les résultats
            var datalistVilles = document.getElementById("selectVille");
            datalistVilles.innerHTML = "";
            if (!results.places) return true;
            results.places.forEach(function (item) { //Pour chaque résultats
                //On créer un objet DOM (balise <option>) et on l'injecte dans notre select
               var option = document.createElement('option');
                console.log(item);
                option.value = item['place name'];
                option.innerHTML = item['place name'];
                datalistVilles.appendChild(option);
            });

        });
    });
});