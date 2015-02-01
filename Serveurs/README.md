# Serveur
Ce dossier contient les différents fichiers des serveurs de Quickiti.
* Serveur de gestion de la base de donnée (gestionBD.js)
* Serveur de récupération de donnée (recup.js)
* Serveur central (central.js)
* Serveur application cliente : web (application_web.js)

Pour fonctionner Quickiti a fait le choix d'utiliser :
* *Node.JS* pour les différents serveurs
* *MongoDB* pour la base de donnée

La communication entre serveurs se fait par socket grâce au module *Socket.IO* de *Node.JS* 

## Serveur de gestion de la base de donnée
Ce serveur est dédié à l'interaction entre la base de donnée et les autres serveurs du projet.

### createAgency : Création d'une compagnie de transport en BD
### updateAgency : Mise à jour d'une compagnie de transport en BD
### selectAgency : Sélection de compagnie de transport en BD
