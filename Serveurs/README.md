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

### Appels basiques
#### Compagnie de transport
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

##### Création
``` js
socket.emit('createAgency', data);
```
* `data` représente toutes les données nécessaires à Quickiti pour définir une compagnie

##### Mise à jour
``` js
socket.emit('updateAgency', query, update);
```
* `query` et `update` sont basés sur le même modèle que `data`

##### Sélection
``` js
socket.emit('selectAgencies', query, callback);
```
* `query` est basé sur le même modèle que `data`
* `callback` est une fonction exécutée lorsque la sélection est terminée

#### Ligne
``` js
var data = {
    route_id : "...",
    route_short_name : "...",
    route_long_name : "...",
    route_desc : "...",
    route_type : "...",
    service_id : "...",
    trip_id : "...",
    trip_headsign : "...",
    compagnieId : "..."
};
```

##### Création
``` js
socket.emit('createLine', data);
```
* `data` représente toutes les données nécessaires à Quickiti pour définir un arrêt

##### Mise à jour
``` js
socket.emit('updateLine', query, update);
```
* `query` et `update` sont basés sur le même modèle que `data`

##### Sélection
``` js
socket.emit('selectLines', query, callback);
```
* `query` est basé sur le même modèle que `data`
* `callback` est une fonction exécutée lorsque la sélection est terminée


#### Arrêt
``` js
var data = {
    stop_id : "...",
    stop_name : "...",
    stop_desc : "...",
    stop_lat : "...",
    stop_lon : "...",
    stop_url : "...",
    location_type : "...",
    compagnieId : "..."
};
```

##### Création
``` js
socket.emit('createStop', data);
```
* `data` représente toutes les données nécessaires à Quickiti pour définir un arrêt

##### Mise à jour
``` js
socket.emit('updateStop', query, update);
```
* `query` et `update` sont basés sur le même modèle que `data`

##### Sélection
``` js
socket.emit('selectStops', query, callback);
```
* `query` est basé sur le même modèle que `data`
* `callback` est une fonction exécutée lorsque la sélection est terminée


#### Lien entre Arret et Ligne
``` js
var data = {
    arretId : "...",
    ligneId : "..."
};
```

##### Création
``` js
socket.emit('createStopLine', data);
```
* `data` représente toutes les données nécessaires à Quickiti pour définir un arrêt

##### Mise à jour
``` js
socket.emit('updateStopLine', query, update);
```
* `query` et `update` sont basés sur le même modèle que `data`

##### Sélection
``` js
socket.emit('selectStopsLines', query, callback);
```
* `query` est basé sur le même modèle que `data`
* `callback` est une fonction exécutée lorsque la sélection est terminée

#### Véhicule
``` js
var data = {
    longitude = "...",
    latitude = "...",
    ligneId = "...",
    compagnieId = "..."
};
```

##### Création
``` js
socket.emit('createVehicle', data);
```
* `data` représente toutes les données nécessaires à Quickiti pour définir un arrêt

##### Mise à jour
``` js
socket.emit('updateVehicle', query, update);
```
* `query` et `update` sont basés sur le même modèle que `data`

##### Sélection
``` js
socket.emit('selectVehicles', query, callback);
```
* `query` est basé sur le même modèle que `data`
* `callback` est une fonction exécutée lorsque la sélection est terminée

### Appels spécifiques
#### Récupération des arrets selon des coordonnées GPS et un périmètre
``` js
var point = {
    longitude = "...",
    latitude = "..."
};

socket.emit('searchStopsNearTo', point, distance, callback);
```
* `distance` représente le périmètre de recherche en mètre par rapport au point

#### Récupération des itineraires d'un point A à un point B
``` js
socket.emit('searchRoutes', pointA, pointB, distance, callback);
```
* `pointA` et `pointB` sont sur le meme modèle que `point`

Voir des exemples d'utilisations dans le fichier [../Test/gestionBD.js](../Test/gestionBD.js)

#### Itinéraire

``` js
var itineraires [] = "...";

var itineraire = {
    changement[] = "...",
    tempsReel = boolean
};

var changement = {
    agency = agencyType,
    arretDebut = stopType,
    arretFin = stopType,
    ligne = lineType
}
```

## Serveur de recuperation de donnee
Ce serveur est dédié à la récupération des données des différentes compagnies de transport.


## Serveur application cliente : web
Ce serveur est dédié à l'application cliente web.
