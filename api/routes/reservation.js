var express = require('express');
var router = express.Router();
var connection = require('../db');
var hal = require('../hal')

router.post('/concerts/:id/reservation', function (req, res, next) { 
  const idConcert = req.params.id; 
  const pseudoUtilisateur = req.body.pseudo; 
  // Vérifier si l'utilisateur existe 
  connection.query('SELECT id FROM Utilisateur WHERE pseudo = ?', [pseudoUtilisateur], (error, rows) => { 
    if (error) {
       console.error('Error connecting: ' + error.stack); 
       return; 
      } 
    if (rows.length === 0) { 
      res.status(400).set('Content-Type', 'application/hal+json') .send({ error: "L'utilisateur n'existe pas" });
      return; 
    } 
    const idUtilisateur = rows[0].id; 
    // Vérifier qu'il reste des places disponibles 
    connection.query('SELECT nb_places FROM Concert WHERE id = ?', [idConcert], (error, rows) => { 
      if (error) { 
        console.error('Error connecting: ' + error.stack); 
        return; 
      } 
      if (rows.length === 0) { 
        res.status(400).set('Content-Type', 'application/hal+json') .send({ error: "Le concert n'existe pas" }); 
        return; 
      } 
      const nbPlacesRestantes = rows[0].nb_places; 

      connection.query('SELECT COUNT(*) as nbReservations FROM Reservation WHERE id_concert = ? AND statut != "annule"', 
        [idConcert], (error, rows) => { 
        if (error) { 
          console.error('Error connecting: ' + error.stack); 
          return; 
        } 
        const nbReservations = rows[0].nbReservations; 
        if (nbReservations >= nbPlacesRestantes) { 
          res.status(400).set('Content-Type', 'application/hal+json') .send({ error: "Plus de places disponibles" }); 
          return; 
        } 
        // Créer la réservation 
        connection.query('INSERT INTO Reservation(id_utilisateur, id_concert, statut) VALUES (?, ?, "en_attente")', 
          [idUtilisateur, idConcert], (error, rows) => { 
          if (error) { 
            console.error('Error connecting: ' + error.stack); 
            return; 
          } 
          const idReservation = rows.insertId; 
          const links = { 
            self: { href: `/concerts/${idConcert}/reservation/${idReservation}` }, 
            confirmation: { href: `/concerts/${idConcert}/reservation/${idReservation}/confirmation` }, 
            annulation: { href: `/concerts/${idConcert}/reservation/${idReservation}/annulation`} 
          };
          const embedded = { 
            concert: { href: `/concerts/${idConcert}` }, 
            utilisateur: { href: `/utilisateurs/${idUtilisateur}` } 
          }; 
          const resource = { 
            _links: links, 
            _embedded: embedded 
          }; 
          res.status(201).set('Content-Type', 'application/hal+json').send(resource); 
        }); 
      }); 
    }); 
  });     
});



module.exports = router;