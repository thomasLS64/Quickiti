# Serveurs
Ce dossier contient les différents fichiers des serveurs de Quickiti.
* Serveur central (central.js)
* Serveur de gestion de la base de donnée (gestionBD.js)
* Serveur de récupération de donnée (recup.js)
* Serveur application cliente : web (application_web.js)

Pour fonctionner Quickiti a fait le choix d'utiliser :
* *Node.JS* pour les différents serveurs
* *MongoDB* pour la base de donnée

La communication entre serveurs se fait par socket grâce au module *Socket.IO* de *Node.JS* 

## Serveur central

## Serveur de gestion de la base de donnée
Ce serveur est dédié à l'interaction entre la base de donnée et les autres serveurs du projet.

### Création d'une compagnie de transport en BD
``` js
socket.emit('createAgency', data);
```
`data` représente toute les données nécessaires à Quickiti pour définir une compagnie
``` js
var data = {
    email : "...",
    password : "...",
    agency_id : "...",
    agency_name : "...",
    agency_url : "...",
    agency_timezone : "...",
    agency_phone : "...",
    agency_lang : "..."
};
```
### Mise à jour d'une compagnie de transport en BD
``` js
socket.emit('updateAgency', query, update);
```
`query` et `update` sont basés sur le même modèle que `data`
### Sélection de compagnie de transport en BD
``` js
socket.emit('selectAgency', query, callback);
```
`query` est basé sur le même modèle que `data`
`callback` est une fonction exécutée lorsque la sélection est terminée

Voir des exemples d'utilisations dans le fichier [../Test/gestionBD.js](../Test/gestionBD.js)

## Serveur de récupération de donnée

## Serveur application cliente : web
