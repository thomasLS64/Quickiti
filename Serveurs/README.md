# Serveurs
Ce dossier contient les différents fichiers des serveurs de Quickiti.
* [Serveur central](#serveur-central) (central.js)
* [Serveur de gestion de la base de donnée](#serveur-de-gestion-de-la-bd) (gestionBD.js)
* [Serveur de récupération de donnée](#serveur-de-recuperation-de-donnee) (recup.js)
* [Serveur application cliente : web](#serveur-application-cliente--web) (application_web.js)

Pour fonctionner Quickiti a fait le choix d'utiliser :
* *Node.JS* pour les différents serveurs
* *MongoDB* pour la base de donnée

La communication entre serveurs se fait par socket grâce au module *Socket.IO* de *Node.JS* 

## Serveur central
Ce serveur est dédié à l'interaction entre les différentes applications clientes et les serveurs du projet.

## Serveur de gestion de la BD
Ce serveur est dédié à l'interaction entre la base de donnée et les autres serveurs du projet.

### Compagnie de transport
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

#### Création
``` js
socket.emit('createAgency', data);
```
* `data` représente toutes les données nécessaires à Quickiti pour définir une compagnie

#### Mise à jour
``` js
socket.emit('updateAgency', query, update);
```
* `query` et `update` sont basés sur le même modèle que `data`

#### Sélection
``` js
socket.emit('selectAgency', query, callback);
```
* `query` est basé sur le même modèle que `data`
* `callback` est une fonction exécutée lorsque la sélection est terminée

Voir des exemples d'utilisations dans le fichier [../Test/gestionBD.js](../Test/gestionBD.js)

## Serveur de recuperation de donnee
Ce serveur est dédié à la récupération des données des différentes compagnies de transport.

## Serveur application cliente : web
Ce serveur est dédié à l'application cliente web.
