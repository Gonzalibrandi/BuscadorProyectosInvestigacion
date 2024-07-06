const express = require('express');
const path = require('path');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const morgan = require('morgan');
//para notificaciones de mail
const fs = require('fs');
const nodemailer = require('nodemailer');
const noResultsSearch = require('./models/noResultsSearch');
const client = require('./meilisearch');
require('dotenv').config();

// initializations
const app = express();
require('./database');
require('./passport/local-auth');

// settings
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug');

// middlewares
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'mysecretsession',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
  app.locals.loginMessage = req.flash('loginMessage');
  app.locals.signupMessage = req.flash('signupMessage');
  app.locals.user = req.user;
  console.log(app.locals)
  next();
});

// routes
app.use('/', require('./routes/index'));

//MAIL
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail(to, project) {
  let mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Nuevo proyecto agregado que coincide con tu búsqueda',
    text: `Hemos agregado un nuevo proyecto que coincide con tu búsqueda: ${project.nombre}\n\nDescripción: ${project.descripcion}`,
  };

  await transporter.sendMail(mailOptions);
}

async function checkSearches() {
  try {
    const searches = await noResultsSearch.find();

    for (const search of searches) {
      console.log(search);
      const searchResults = await client.index('Proyectos').search(search.searchQuery);

      if (searchResults.hits.length > 0) {
        for (const hit of searchResults.hits) {
          console.log(hit)
          await sendEmail(search.userEmail, hit);
        }
        await noResultsSearch.deleteOne({ _id: search._id });
      }
    }
  } catch (err) {
    console.error('Error checking searches:', err);
  }
} 


// Manejo de errores 404
app.use(function(req, res, next) {
  res.status(404).send('Página no encontrada');
});

// Manejo de errores
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Error interno del servidor');
});

checkSearches();

module.exports = app;