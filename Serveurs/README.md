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
#### Compagnie de transport [Agency]
``` js
var data = {
    email : [String],
    password : [String],
    agency_id : [String],
    agency_name : [String],
    agency_url : [String],
    agency_timezone : [String],
    agency_phone : [String],
    agency_lang : [String]
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

#### Ligne [Line]
``` js
var data = {
    route_id : [String],
    route_short_name : [String],
    route_long_name : [String],
    route_desc : [String],
    route_type : [String],
    service_id : [String],
    trip_id : [String],
    trip_headsign : [String],
    compagnieId : [ObjectId]
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


#### Arrêt [Stop]
``` js
var data = {
    stop_id : [String],
    stop_name : [String],
    stop_desc : [String],
    stop_url : [String],
    location_type : [Number],
    location : [Number, Number],
    compagnieId : [ObjectId]
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


#### Lien entre Arret et Ligne [StopLine]
``` js
var data = {
    arretId : [ObjectId],
    ligneId : [ObjectId]
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

#### Véhicule [Vehicle]
``` js
var data = {
    longitude : [Number],
    latitude : [Number],
    ligneId : [ObjectId],
    compagnieId : [ObjectId],
    date : [Date] 
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
    longitude : [Number],
    latitude : [Number]
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
var itineraires = [itineraire, ...];

var itineraire = {
    changements : [changement, ...],
    tempsReel : [Boolean]
};

var changement = {
    agency : [Agency],
    arretDebut : [Stop],
    arretFin : [Stop],
    ligne : [Line]
};
```

## Serveur de recuperation de donnee
Ce serveur est dédié à la récupération des données des différentes compagnies de transport.


## Serveur application cliente : web
Ce serveur est dédié à l'application cliente web.
