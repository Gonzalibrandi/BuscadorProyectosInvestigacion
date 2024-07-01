const router = require('express').Router();
const passport = require('passport');
require('../passport/local-auth');
const User = require('../models/user'); // Asegúrate de que este sea el modelo correcto de tu usuario
const NoResultsSearch = require('../models/noResultsSearch');
const fs = require('fs');
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
router.get('/', isAuthenticated, (req, res) => {
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

    const newUser = new User({ username, userEmail, password });
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


//AGREGADO PARA MAIL
// Ruta para realizar la búsqueda de proyectos
router.get('/', isAuthenticated, async (req, res) => {
  const query = req.query.q;
  const userEmail = req.user.username; // Asumiendo que el usuario está autenticado y el email está disponible

  console.log(`Realizando búsqueda para: ${query} por el usuario: ${userEmail}`);

  fs.readFile(proyectosPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error leyendo el archivo de proyectos:', err);
      return res.status(500).send('Error interno del servidor');
    }

    const proyectos = JSON.parse(data);
    const results = proyectos.filter(proyecto => proyecto.title.includes(query));

    console.log(`Resultados encontrados: ${results.length}`);

    if (results.length === 0) {
      const noResultsSearch = new NoResultsSearch({ userEmail, searchQuery: query });
      noResultsSearch.save((err) => {
        if (err) {
          console.error('Error guardando la búsqueda sin resultados:', err);
        } else {
          console.log('Búsqueda sin resultados guardada correctamente');
        }
      });
    }

    res.render('results', { results });
  });
});

function startWatchingProjectsFile() {
  console.log('Iniciando el monitoreo del archivo de proyectos...');
  
  fs.watch(proyectosPath, async (eventType, filename) => {
    if (eventType === 'change') {
      console.log(`Cambio detectado en el archivo: ${filename}`);
      
      const searches = await NoResultsSearch.find({});
      
      fs.readFile(proyectosPath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error leyendo el archivo de proyectos:', err);
          return;
        }

        const proyectos = JSON.parse(data);

        searches.forEach(search => {
          const matchingProjects = proyectos.filter(proyecto => proyecto.title.includes(search.searchQuery));
          if (matchingProjects.length > 0) {
            sendNotificationEmail(search.userEmail, search.searchQuery, matchingProjects);
            search.deleteOne(); // Eliminar la búsqueda después de notificar al usuario
          }
        });
      });
    }
  });
}

async function sendNotificationEmail(userEmail, query, projects) {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  let projectList = projects.map(p => `- ${p.title}`).join('\n');
  let mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: 'Nuevos proyectos encontrados',
    text: `Se han encontrado nuevos proyectos que coinciden con tu búsqueda: ${query}\n\n${projectList}`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Correo de notificación enviado a ${userEmail}`);
  } catch (err) {
    console.error('Error al enviar el correo:', err);
  }
}

startWatchingProjectsFile();

module.exports = router;