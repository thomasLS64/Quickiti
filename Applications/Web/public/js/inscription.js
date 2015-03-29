/*
    Fonction qui sera appellée pour afficher à l'utilisateur l'état de traitement du formulaire
*/
function affMessage(message, typeMessage) {
    console.log(message);
    var divMess = document.getElementById("messageInfo");
    console.log(typeof message);
    if (typeof message == "object") {
        divMess.innerHTML = "";
        message.forEach(
            function (item) {
                var messDOM = document.createElement("div");
                messDOM.innerHTML = item;
                divMess.appendChild(messDOM);
            }
        );
    }
    else {
        divMess.innerHTML = message;
    }
    divMess.className = "bg-"+typeMessage;
    return this;
}
//Connexion au serveur web
socketWebServer = io("http://127.0.0.1:8080")
    .on('retourUtilisateur', function (message, typeMessage) {
           affMessage(message, typeMessage);
       });
//Evenement qui se déclanche quand la page est chargée
document.addEventListener("DOMContentLoaded", function () {
    //Evenement qui se déclanche quand on valide le formulaire
    document.getElementById("formInscription").addEventListener("submit", function (event) {
        //On arrête la propagation de l'evenement de l'envoi du formulaire et on empèche le navigateur d'agir
        event.preventDefault();
        //On informe l'utilisateur qu'on envoi le formulaire
        affMessage("Envoi du formulaire...");

        //On créer un objet qui contient toutes les informations du formulaire
        elementsForm = this.elements;
        var objForm = {
            infoGenerales: {
                raisSocial: elementsForm.inputRS.value,
                email: elementsForm.inputEmail.value,
                motDePasse: elementsForm.inputPass.value,
                ville: elementsForm.selectVille.value,
                pays: elementsForm.selectPays.value,
                adresse: elementsForm.inputAddr.value,
                codePostal: elementsForm.inputCP.value,
                urlSiteWeb: elementsForm.inputSite.value,
                telephone: elementsForm.inputTel.value
            },
            gtfs: {
                zipGTFS: elementsForm.inputGTFSZipFile.value,
                BoolUseRealTime: elementsForm.inputUseGTFSRealTime.checked,
                addrGTFSTripUpdate: elementsForm.inputGTFSRealTimeTripUpdate.value,
                addrGTFSAlert: elementsForm.inputGTFSRealTimeAlert.value,
                addrGTFSVehiclePosition: elementsForm.inputGTFSRealVehiclePosition.value
            }
        };
        console.log(objForm);
        //On envoi l'objet au serveur web
        elementsForm.namedItem("submitInscription").disabled = true;
        socketWebServer.emit("inscription", objForm, function (isSuccess) {
            elementsForm.namedItem("submitInscription").disabled = false;
            console.log(isSuccess);
            if (isSuccess) {
                affMessage("Vous avez bien été enregistré, rendez vous dans l'onglet connexion pour vous connecter.", "success");
            }
            else {

            }
        });
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