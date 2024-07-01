const express = require('express');
const path = require('path');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const morgan = require('morgan');
//para notificaciones de mail
const fs = require('fs');
const nodemailer = require('nodemailer');
const NoResultsSearch = require('./models/noResultsSearch');
const proyectosPath = path.join(__dirname, './data/proyectos.json');
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

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Función para enviar correo electrónico
async function sendEmail(to, project) {
  let mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Nuevo proyecto agregado que coincide con tu búsqueda',
    text: `Hemos agregado un nuevo proyecto que coincide con tu búsqueda: ${project.title}\n\nDescripción: ${project.description}`
  };

  await transporter.sendMail(mailOptions);
}

// Función para verificar nuevas coincidencias
async function checkNewProjectAgainstSavedSearches(newProject) {
  const searches = await NoResultsSearch.find();

  for (const search of searches) {
    if (newProject.title.includes(search.searchQuery) || newProject.description.includes(search.searchQuery)) {
      await sendEmail(search.userEmail, newProject);
      await NoResultsSearch.deleteOne({ _id: search._id }); // Eliminar la búsqueda después de notificar
    }
  }
}

// Monitorear cambios en proyectos.json
fs.watch(proyectosPath, async (eventType, filename) => {
  if (eventType === 'change') {
    console.log(`Archivo ${proyectosPath} ha cambiado`);
    const proyectosData = JSON.parse(fs.readFileSync(proyectosPath, 'utf8'));
    for (const proyecto of proyectosData) {
      await checkNewProjectAgainstSavedSearches(proyecto);
    }
  }
});