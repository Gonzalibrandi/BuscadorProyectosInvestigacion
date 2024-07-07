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
    text: `Se ha encontrado un nuevo proyecto que coincide con tu búsqueda:
    Título: ${project.nombre || 'Sin título'}
    Descripción: ${project.descripcion || 'Sin descripcion'}
    Estado: ${project.estatus || 'Sin estado'}
    Ubicación: ${project.basedOn || 'Sin ubicacion'}
    Área: ${project.granArea1 || 'Sin area'}
    Tipo: ${project.tipo || 'Sin tipo'}`,
  };

  await transporter.sendMail(mailOptions);
}

async function checkSearches() {
  try {
    const searches = await noResultsSearch.find();

    for (const search of searches) {
      const { searchQuery, estado, ubicacion, area, tipo, userEmail, _id } = search;

      // Crear un filtro para MeiliSearch usando los campos adicionales
      let filters = [];
      if (estado) filters.push(`estatus = "${estado}"`);
      if (ubicacion) filters.push(`basedOn = "${ubicacion}"`);
      if (area) filters.push(`granArea1 = "${area}"`);
      if (tipo) filters.push(`tipo = "${tipo}"`);
      const filterString = filters.join(' AND ');

      // Ajustar las opciones de búsqueda dependiendo de si hay searchQuery o no
      let searchOptions = {};
      if (filterString) {
        searchOptions.filter = filterString;
      }

      // Realizar la búsqueda
      const searchResults = await client.index('Proyectos').search(searchQuery || '', searchOptions);

      if (searchResults.hits.length > 0) {
        for (const hit of searchResults.hits) {
          // Modifica el correo electrónico para incluir detalles del proyecto
          await sendEmail(userEmail, hit);
        }
        await noResultsSearch.deleteOne({ _id });
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