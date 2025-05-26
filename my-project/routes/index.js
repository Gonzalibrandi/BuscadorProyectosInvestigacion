var express = require('express');
var router = express.Router();

/* GET home page - lista de índices */
router.get('/', function(req, res, next) {
  res.render('indices', { title: 'Índices Disponibles' });
});

/* GET página de búsqueda para un índice específico */
router.get('/buscar/:indice', function(req, res, next) {
  res.render('search', { title: 'Buscador - ' + req.params.indice });
});

module.exports = router; 