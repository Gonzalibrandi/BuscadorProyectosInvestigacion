var express = require('express');
var router = express.Router();
const passport = require('passport');

// Rutas para manejar la autenticación
router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/', // Redirigir a el buscador si la autenticación es exitosa
  failureRedirect: '/login' // Redirigir a /login si la autenticación falla
}));

router.post('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});

// Middleware para proteger rutas
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Ruta para la página principal protegida
router.get('/', ensureAuthenticated, (req, res) => {
  res.render('index', { user: req.user });
});

module.exports = router;
