const router = require('express').Router();
const passport = require('passport');
require('../passport/local-auth');
const favoriteSearch = require('../models/favoriteSearch');

// Middleware para asegurar que el usuario este autenticado
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login'); // Redirige a la página de inicio de sesión si no está autenticado
}

// Ruta para la página de inicio de sesión
router.get('/login', (req, res) => {
  res.render('login');
});

// Ruta para la página principal, protegida por autenticación
router.get('/', isAuthenticated, async (req, res) => {
  res.render('index', { user: req.user });
});

// Ruta para la página de registro
router.get('/signup', (req, res) => {
  res.render('signup');
});

// Ruta para logueo con Google
router.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

// Ruta para logueo con Google
router.get('/auth/google/callback',
  passport.authenticate( 'google', {
      successRedirect: '/',
      failureRedirect: '/login'
}));

// Ruta para la página de favoritos
router.get('/favoritos', isAuthenticated, (req, res) => {
  res.render('favoritos', { user: req.user });
});

// Manejo del registro de usuarios
router.post('/signup', passport.authenticate('local-signup', {
  successRedirect: '/login',
  failureRedirect: '/signup',
  failureFlash: true
}));

// Manejo del inicio de sesión
router.post('/login', passport.authenticate('local-login', {
  successRedirect: '/', // Redirige a la página principal después de un inicio de sesión exitoso
  failureRedirect: '/login',
  failureFlash: true
}));

// Manejo de cierre de sesión
router.post('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});

// Manejo del envío de favoritos
router.post('/favoritos', isAuthenticated, (req, res) => {
  res.redirect('/favoritos');
});

// Guardado de proyectos favoritos
router.post('/setearFavoritos', isAuthenticated, async (req, res) => {
  const { searchQuery, Estado, Ubicacion, Area, Tipo } = req.body;
  const userEmail = req.user.userEmail;
  const newSearch = new favoriteSearch({
    userEmail: userEmail,
    searchQuery: searchQuery,
    createdAt: new Date(),
    estado: Estado,
    ubicacion: Ubicacion,
    area: Area,
    tipo: Tipo
  });

  try {
    await newSearch.save();
    res.redirect('/favoritos');
  } catch (err) {
    console.error(err);
    res.redirect('/favoritos');
  }
});
module.exports = router;