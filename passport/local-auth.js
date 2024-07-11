const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth2').Strategy;
require('dotenv').config();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const User = require('../models/user');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});


// Autenticacion en el logueo
passport.use('local-signup', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, async (req, username, password, done) => {
  const { userEmail, passwordRep } = req.body;
  if (password !== passwordRep) {
    return done(null, false, req.flash('signupMessage', 'Las contraseñas no coinciden.'));
  }
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return done(null, false, req.flash('signupMessage', 'El nombre de usuario ya existe.'));
    }
    const newUser = new User({ userEmail, username, password });
    await newUser.save();
    return done(null, newUser);
  } catch (err) {
    return done(err, false, req.flash('signupMessage', 'Ocurrió un error durante el registro.'));
  }
}));

// Autenticacion en el registro
passport.use('local-login', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, async (req, username, password, done) => {
  const user = await User.findOne({username: username});
  if(!user) {
    return done(null, false, req.flash('loginMessage', 'El usuario no existe.'));
  }
  if(!user.comparePassword(password)) {
    return done(null, false, req.flash('loginMessage', 'La contraseña no es correcta.'));
  }
  return done(null, user);
}));

// Autenticacion con Google
passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/callback",
  passReqToCallback: true,
},
async (request, accessToken, refreshToken, profile, done) => {
  try {
    const user = await User.findOne({ googleId: profile.id });
    if (user) {
      return done(null, user);
    } else {
      const newUser = new User({
        googleId: profile.id,
        username: profile.displayName,
        userEmail: profile.emails[0].value
      });
      await newUser.save();
      return done(null, newUser);
    }
  } catch (err) {
    return done(err);
  }
}));