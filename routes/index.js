const router = require('express').Router();
const passport = require('passport');
require('../passport/local-auth');
const User = require('../models/user'); // Asegúrate de que este sea el modelo correcto de tu usuario
const NoResultsSearch = require('../models/noResultsSearch');
const path = require('path');
const proyectosPath = path.join(__dirname, '../data/proyectos.json');

// Middleware para asegurar que el usuario está autenticado
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login'); // Redirige a la página de inicio de sesión si no está autenticado
}

// Ruta para la página de inicio de sesión
router.get('/login', (req, res) => {
  res.render('login', { messages: req.flash('loginMessage') });
});

// Ruta para la página principal, protegida por autenticación
router.get('/', isAuthenticated, async (req, res) => {
  res.render('index', { user: req.user });
});

// Ruta para la página de registro
router.get('/signup', (req, res) => {
  res.render('signup', { messages: req.flash('signupMessage') });
});

router.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

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
router.post('/signup', async (req, res) => {
  const { userEmail, username, password, passwordRep } = req.body;

  if (password !== passwordRep) {
    req.flash('signupMessage', 'Las contraseñas no coinciden.');
    return res.redirect('/signup');
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      req.flash('signupMessage', 'El nombre de usuario ya existe.');
      return res.redirect('/signup');
    }

    const newUser = new User({ userEmail, username, password });
    await newUser.save();

    req.flash('loginMessage', 'Te has registrado correctamente. Ahora puedes iniciar sesión.');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    req.flash('signupMessage', 'Ocurrió un error durante el registro.');
    res.redirect('/signup');
  }
});

// Manejo del inicio de sesión
router.post('/login', passport.authenticate('local-login', {
  successRedirect: '/', // Redirige a la página principal después de un inicio de sesión exitoso
  failureRedirect: '/login',
  failureFlash: true
}));

// Ruta para cerrar sesión
router.post('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});

// Ruta para manejar el envío de favoritos
router.post('/favoritos', isAuthenticated, (req, res) => {
  res.redirect('/favoritos');
});

router.post('/setearFavoritos', isAuthenticated, async (req, res) => {
  const { searchQuery } = req.body;
  const userEmail = req.user.userEmail;
  const newSearch = new NoResultsSearch({
    userEmail: userEmail,
    searchQuery: searchQuery,
    createdAt: new Date()
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