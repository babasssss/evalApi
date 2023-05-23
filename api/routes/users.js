var express = require('express');
var router = express.Router();
var connection = require('../db')

/* GET users listing. */
router.get('/users', function (req, res, next) {

  connection.query('SELECT * FROM user;',  (error, rows, fields) => {
    const users = rows.map(element => {
      return {
        pseudo: element.pseudo
      }
    });
    res.send(users);
  })
});

module.exports = router;
