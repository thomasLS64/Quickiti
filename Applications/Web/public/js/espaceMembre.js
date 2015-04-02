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
    .on('userCallback', function (message, typeMessage) {
            console.log(message);
           affMessage(message, typeMessage);
       });
function sendForm(FormDOM, objForm, idSubmitButton, commande, callback) {
    affMessage("Envoi du formulaire...");
    //On désactive le bouton d'inscription pendant le traitement du formulaire
    FormDOM.elements.namedItem(idSubmitButton).disabled = true;

    //On envoi l'objet au serveur web
    socketWebServer.emit(commande, objForm, function (err, jeton) {
        FormDOM.elements.namedItem(idSubmitButton).disabled = false;
        if (callback) callback(err, jeton);
    });
}
//Évenement qui se déclenche quand la page est chargée
document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById('formInscription')) {
        document.getElementById('formInscription').addEventListener('submit',
            function (event) {
                //On arrête la propagation de l'evenement de l'envoi du formulaire et on empèche le navigateur d'agir
                event.preventDefault();
                affMessage("Envoi du formulaire...");
                var elementsForm = this.elements;
                var objForm = {
                    gtfs: {
                        zipGTFS: elementsForm.inputGTFSZipFile.value,
                        BoolUseRealTime: elementsForm.inputUseGTFSRealTime.checked,
                        addrGTFSTripUpdate: elementsForm.inputGTFSRealTimeTripUpdate.value,
                        addrGTFSAlert: elementsForm.inputGTFSRealTimeAlert.value,
                        addrGTFSVehiclePosition: elementsForm.inputGTFSRealVehiclePosition.value
                    }
                };
                sendForm(this, objForm, "submitInscription", "subscribeAgency", function (err, jetonConnexion) {
                    console.log("err", err);
                    console.log("jeton", jetonConnexion);
                    if (!err) {
                        console.log("jeton", jetonConnexion);
                        affMessage("Vos informations ont bien été traité... Redirection vers l'étape deux de votre inscription", "success");
                        setTimeout(function () {
                            window.location = '/modifier?jeton=' + jetonConnexion;
                        }, 2000);
                    }
                    //Sinon les erreurs seront affiché par la fonction userCallback
                });
            }
        );
    }
    if (document.getElementById("formModifs")) {
        //Evenement qui se déclanche quand on valide le formulaire
        document.getElementById("formModifs").addEventListener("submit", function (event) {

            //On arrête la propagation de l'evenement de l'envoi du formulaire et on empèche le navigateur d'agir
            event.preventDefault();

            //On informe l'utilisateur qu'on envoi le formulaire
            affMessage("Envoi du formulaire...");

            //On créer un objet qui contient toutes les informations du formulaire
            var elementsForm = this.elements;
            var objForm = {
                infoGenerales: {
                    inputIdAgency: elementsForm.inputIdAgency.value,
                    email: elementsForm.inputEmail.value,
                    motDePasse: elementsForm.inputPass.value,
                    ville: elementsForm.selectVille.value,
                    pays: elementsForm.selectPays.value,
                    adresse: elementsForm.inputAddr.value,
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

            sendForm(this, objForm, "submitUpdate", "updateAgency");
        });
    }
    if (document.getElementById("inputCP")) {
        //Évènement qui se déclenche quand on perd le focus du champs de code postale
        document.getElementById("inputCP").addEventListener('change', function () {
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
    }
    if (document.getElementById("updateGTFS")) {
        document.getElementById("updateGTFS").addEventListener('click', function () {
            this.innerHTML = "Mise à jour en cours...";
            this.disabled = true;
            var that = this;
            socketWebServer.emit('updateGTFS', this.dataset.idagency, function (err) {
                console.log("Mise à jour OK");
                if (!err) {
                    that.innerHTML = "Mise à jour terminée.";
                }
                else {
                    that.innerHTML = "Echec de la mise à jour.";
                }
            })
        });
    }
});