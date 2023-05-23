/**
 * Export des fonctions utils hal
 */

var connection = require('./db');

/**
 * Retourne un Link Object
 * @param {*} url 
 * @param {*} type 
 * @param {*} name 
 * @param {*} templated 
 * @param {*} deprecation 
 * @returns 
 */
function halLinkObject(url, type = '', name = '', templated = false, deprecation = false) {

    return {
        "href": url,
        "templated": templated,
        ...(type && { "type": type }),
        ...(name && { "name": name }),
        ...(deprecation && { "deprecation": deprecation })
    }
}

/**
 * Retourne une représentation Ressource Object (HAL) d'un concert
 * @param {*} reservationData Données brutes d'un concert
 * @returns un Ressource Object Concert (spec HAL)
 */
function mapConcertoResourceObject(reservationData, baseURL) {

    /**
     * A faire: requêter le nombre de reservations pour calculer le nombre de places disponibles
     * Attention a l'async
     */
    const reservations = 0

    const resourceObject = {
        "_links": [{
            "self": halLinkObject(baseURL + '/concerts' + '/' + reservationData.id, 'string', 'Les informations d\'un concert'),
            "reservation": halLinkObject(baseURL + '/concerts' + '/' + reservationData.id + '/reservation', 'string')
        }],
        "_embedded": {
            "id": reservationData.id,
            "date": reservationData.date_debut,
            "nb_places": reservationData.nb_places,
            "nb_places_disponibles": reservationData.nb_places - reservations.length,
            "lieu": reservationData.lieu,
            "description": reservationData.description
        }
    }

    return resourceObject
}

/**
 * Retourne un Resource Object d'un utilisateur
 * @param {*} utilisateurData 
 * @param {*} baseURL 
 * @returns 
 */
function mapUtilisateurtoResourceObject(utilisateurData, baseURL) {

    return {
        "_links": [{
            "self": halLinkObject(baseURL + '/utilisateurs' + '/' + utilisateurData.pseudo, 'string'),
        }],
        "_embedded": {
            "pseudo": utilisateurData.pseudo
        }
    }
}

/**
 * Retourne une représentation Ressource Object (HAL) d'une réservation
 * @param {*} reservationData Données brutes d'un concert
 * @returns un Ressource Object Reservation (spec HAL)
 */
function mapReservationtoResourceObject(reservationData, baseURL) {

    
    const resourceObject = {
        "_links": [{
            "self": halLinkObject(baseURL + '/concerts' + '/' + reservationData.id + '/reservation', 'string'),
            "confirm": halLinkObject(baseURL + '/concerts' + '/' + reservationData.id + '/reservation' + '/confirm', 'string'),
            "cancel": halLinkObject(baseURL + '/concerts' + '/' + reservationData.id + '/reservation' + '/cancel', 'string')
          }],
          "_embedded": {
            "reservation": {
              "user_id": reservationData.user_id,
              "concert_id": reservationData.concert_id,
              "status": reservationData.status,
              "date_reservation": reservationData.date_reservation
            }
          }
        };

    return resourceObject
}

module.exports = { halLinkObject, mapConcertoResourceObject, mapUtilisateurtoResourceObject, mapReservationtoResourceObject };