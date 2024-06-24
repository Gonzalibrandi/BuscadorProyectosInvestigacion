const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

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
    newUser.password = newUser.encryptPassword(password);
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