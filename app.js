const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const passport = require('passport');
const PassportLocal = require('passport-local').Strategy;
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

// Configuración del motor de vistas
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware básicos
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesión para Passport
app.use(session({
  secret: 'secreto',
  resave: true,
  saveUninitialized: true
}));

// Inicialización de Passport
app.use(passport.initialize());
app.use(passport.session());

// Estrategia de autenticación local con Passport
passport.use(new PassportLocal(function(username, password, done) {
  if (username === "poli" && password === "12345") {
    return done(null, { id: 1, name: "poli" });
  }
  done(null, false);
}));

// Serialización de usuario
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// Deserialización de usuario
passport.deserializeUser(function(id, done) {
  done(null, { id: 1, name: "poli" });
});

// Usar las rutas definidas en indexRouter y usersRouter
app.use('/', indexRouter);
app.use('/users', usersRouter);

// Manejo de errores 404
app.use(function(req, res, next) {
  res.status(404).send('Página no encontrada');
});

// Manejo de errores
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Error interno del servidor');
});

module.exports = app;