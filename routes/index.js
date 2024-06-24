const router = require('express').Router();
const passport = require('passport');
const User = require('../models/user'); // Asegúrate de que este sea el modelo correcto de tu usuario

// Middleware para asegurar que el usuario está autenticado
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login'); // Redirige a la página de inicio de sesión si no está autenticado
}

// Ruta para la página de inicio de sesión
router.get('/login', (req, res) => {
  res.render('login', { message: req.flash('loginMessage') });
});

// Ruta para la página principal, protegida por autenticación
router.get('/', isAuthenticated, (req, res) => {
  res.render('index', { user: req.user });
});

// Ruta para la página de registro
router.get('/signup', (req, res) => {
  res.render('signup', { message: req.flash('signupMessage') });
});

// Manejo del registro de usuarios
router.post('/signup', async (req, res) => {
  const { username, password, passwordRep } = req.body;

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

    const newUser = new User({ username, password });
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

module.exports = router;
