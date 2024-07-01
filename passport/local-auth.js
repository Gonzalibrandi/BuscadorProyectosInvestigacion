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

passport.use('local-signup', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true  //permite pedir mas datos al registrarse/logearse
}, async (req, username, password, done) => {
  const user = await User.findOne({'username': username})
  console.log(user)
  if(user) {
    return done(null, false, req.flash('signupMessage', 'The username is already Taken.'));
  } else {
    const newUser = new User();
    newUser.username = username;
    newUser.password = password;
    console.log(newUser)
    await newUser.save();
    done(null, newUser);
  }
}));

passport.use('local-login', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, async (req, username, password, done) => {
  const user = await User.findOne({username: username});
  if(!user) {
    return done(null, false, req.flash('loginMessage', 'No User Found'));
  }
  if(!user.comparePassword(password)) {
    return done(null, false, req.flash('loginMessage', 'Incorrect Password'));
  }
  return done(null, user);
}));

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
        // Add other profile fields as needed
      });
      await newUser.save();
      return done(null, newUser);
    }
  } catch (err) {
    return done(err);
  }
}));