import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth2';
import dotenv from 'dotenv';
import { Request } from 'express';
import User, { IUser } from '../models/user';

// Configurar variables de entorno
dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;

// Definir tipos para las estrategias
interface IVerifyOptions {
  message: string;
}

// Serialización y deserialización del usuario
passport.serializeUser((user: Express.User, done: (err: any, id?: unknown) => void) => {
  done(null, (user as IUser).id);
});

passport.deserializeUser(async (id: string, done: (err: any, user?: Express.User | false | null) => void) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Autenticación en el registro
passport.use('local-signup', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, async (req: Request, username: string, password: string, done: (error: any, user?: Express.User | false, options?: IVerifyOptions) => void) => {
  const { userEmail, passwordRep } = req.body;
  
  if (password !== passwordRep) {
    return done(null, false, { message: 'Las contraseñas no coinciden.' });
  }
  
  try {
    const existingUser = await User.findOne({ username });
    
    if (existingUser) {
      return done(null, false, { message: 'El nombre de usuario ya existe.' });
    }
    
    const newUser = new User({ userEmail, username, password });
    await newUser.save();
    return done(null, newUser);
  } catch (err) {
    return done(err, false, { message: 'Ocurrió un error durante el registro.' });
  }
}));

// Autenticación en el login
passport.use('local-login', new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, async (req: Request, username: string, password: string, done: (error: any, user?: Express.User | false, options?: IVerifyOptions) => void) => {
  try {
    const user = await User.findOne({ username: username });
    
    if (!user) {
      return done(null, false, { message: 'El usuario no existe.' });
    }
    
    if (!user.comparePassword(password)) {
      return done(null, false, { message: 'La contraseña no es correcta.' });
    }
    
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Autenticación con Google
passport.use(new GoogleStrategy(
  {
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback",
    passReqToCallback: true,
  },
  async (request: Request, accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: Express.User | false) => void) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        return done(null, user);
      } else {
        user = new User({
          googleId: profile.id,
          username: profile.displayName,
          userEmail: profile.emails[0].value,
          password: null, // Campo vacío para usuarios de Google
        });
        
        await user.save();
        return done(null, user);
      }
    } catch (err) {
      return done(err);
    }
  }
));

export default passport;