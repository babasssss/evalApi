var express = require('express');
var router = express.Router();
var connection = require('../db');
var hal = require('../hal')

// #swagger.summary = "Liste des concerts"
router.get('/concerts', (req, res, next) => {
  connection.query('SELECT * FROM Concert', (error, rows) => {
    if (error) {
      console.error('Error connecting: ' + error.stack);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const concerts = rows.map(row => hal.mapConcertoResourceObject(row, `${req.protocol}://${req.get('host')}`));

    const concertsResourceObject = {
      _links: [],
      _embedded: { concerts }
    };

    res.status(200).json(concertsResourceObject);
  });
});

// GET /concerts/:id/reservations
router.get('/concerts/:id/reservations', async (req, res, next) => {
  try {
    const reservations = await connection.query('SELECT * FROM reservation WHERE concert_id = ? AND statut = "confirmé";', [req.params.id]);

    res.status(200).json(reservations);
  } catch (error) {
    console.error('Error connecting: ' + error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /concerts/{id}
router.get('/concerts/:id', async (req, res, next) => {
  const concertId = req.params.id;

  if (!/^\d+$/.test(concertId)) {
    return res.status(400).json({ error: 'Invalid concert ID' });
  }

  try {
    const rows = await connection.query('SELECT * FROM Concert WHERE id = ?', [concertId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Concert not found' });
    }

    const concertResourceObject = {
      _links: [],
      _embedded: {
        concert: hal.mapConcertoResourceObject(rows[0], `${req.protocol}://${req.get('host')}`)
      }
    };

    res.status(200).json(concertResourceObject);
  } catch (error) {
    console.error('Error connecting: ' + error.stack);
    res.status(500).json({ error: 'Database error' });
  }
});
// POST /foobar
router.post('/foobar', (req, res, next) => {
  const { obj } = req.body;

  /*  #swagger.parameters['obj'] = {
              in: 'body',
              description: 'Some description...',
              schema: {
                  $name: 'John Doe',
                  $age: 29,
                  about: ''
              }
      } */

  console.log(obj);
  res.status(200).send('POST /concerts/{id}');
});

// POST /concerts/:id/reservation
router.post('/concerts/:id/reservation', async (req, res, next) => {
  const pseudo = req.body.pseudo;

  /* #swagger.parameters['pseudo'] = {
        in: 'formData',
        description: 'Le pseudo de l\'utilisateur qui effectue la réservation',
        required: 'true',
        type: 'string',
        format: 'application/x-www-form-urlencoded',
  } */

  if (!pseudo) {
    return res.status(400).json({ response: "Requête invalide, veuillez fournir le pseudo de l'utilisateur" });
  }

  try {
    const [user] = await connection.query('SELECT id, pseudo FROM user WHERE pseudo = ?', [pseudo]);

    if (!user) {
      return res.status(400).json({ response: "Requête invalide, l'utilisateur n'existe pas" });
    }

    const userId = user.id;

    const [reservationCount] = await connection.query(
      'SELECT COUNT(*) as nbReservation FROM Reservation r INNER JOIN user u ON r.user_id = u.id INNER JOIN Concert c ON c.id = r.concert_id WHERE pseudo = ? AND c.id = ?',
      [pseudo, req.params.id]
    );

    const nbReservations = reservationCount.nbReservation;

    if (nbReservations > 0) {
      return res.status(400).json({ response: `Requête valide: l'utilisateur ${pseudo} a déjà une réservation pour ce concert` });
    }

    const [seatsCount] = await connection.query(
      'SELECT (SELECT nb_places FROM Concert WHERE id = ?) - (SELECT COUNT(*) FROM Reservation WHERE statut != "annulée" AND concert_id = ?) AS nb_places_dispo',
      [req.params.id, req.params.id]
    );

    const nbPlacesDispo = seatsCount.nb_places_dispo;

    if (nbPlacesDispo === 0) {
      return res.status(400).json({ response: "Requête valide: Plus de places disponibles" });
    }

    const reservation = {
      user_id: userId,
      concert_id: req.params.id,
      statut: 'à confirmer',
      date_reservation: new Date()
    };

    await connection.query('INSERT INTO Reservation SET ?', reservation);

    const resourceObject = {
      _links: [],
      _embedded: {
        reservation: hal.mapReservationtoResourceObject(reservation, `${req.protocol}://${req.get('host')}`)
      }
    };

    res.status(200).json(resourceObject);
  } catch (error) {
    console.error('Error connecting: ' + error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// PUT /concerts/:id/reservation
router.put('/concerts/:id/reservation', async (req, res, next) => {
  const pseudo = req.body.pseudo;

  /* #swagger.parameters['pseudo'] = {
        in: 'formData',
        description: 'Le pseudo de l\'utilisateur dont la réservation doit être confirmée',
        required: 'true',
        type: 'string',
        format: 'application/x-www-form-urlencoded',
  } */

  if (!pseudo) {
    return res.status(400).json({ response: "Requête invalide, veuillez fournir le pseudo de l'utilisateur" });
  }

  try {
    const [user] = await connection.query('SELECT id FROM user WHERE pseudo = ?', [pseudo]);

    if (!user) {
      return res.status(400).json({ response: "Requête invalide, l'utilisateur n'existe pas" });
    }

    const userId = user.id;

    const result = await connection.query('UPDATE Reservation SET statut = "confirmé" WHERE user_id = ? AND concert_id = ?', [userId, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(400).json({ response: `Requête valide: l'utilisateur ${pseudo} n'a pas de réservation à confirmer pour ce concert` });
    }

    res.status(200).json({ response: "Réservation confirmée avec succès" });
  } catch (error) {
    console.error('Error connecting: ' + error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// DELETE /concerts/:id/reservation
router.delete('/concerts/:id/reservation', async (req, res, next) => {
  const pseudo = req.body.pseudo;

  /* #swagger.parameters['pseudo'] = {
        in: 'formData',
        description: 'Le pseudo de l\'utilisateur dont la réservation doit être annulée',
        required: 'true',
        type: 'string',
        format: 'application/x-www-form-urlencoded',
  } */

  if (!pseudo) {
    return res.status(400).json({ response: "Requête invalide, veuillez fournir le pseudo de l'utilisateur" });
  }

  try {
    const [user] = await connection.query('SELECT id FROM user WHERE pseudo = ?', [pseudo]);

    if (!user) {
      return res.status(400).json({ response: "Requête invalide, l'utilisateur n'existe pas" });
    }

    const userId = user.id;

    const result = await connection.query('UPDATE Reservation SET statut = "annulée" WHERE user_id = ? AND concert_id = ?', [userId, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(400).json({ response: `Requête valide: l'utilisateur ${pseudo} n'a pas de réservation pour ce concert` });
    }

    res.status(200).json({ response: "Réservation annulée avec succès" });
  } catch (error) {
    console.error('Error connecting: ' + error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});






module.exports = router;