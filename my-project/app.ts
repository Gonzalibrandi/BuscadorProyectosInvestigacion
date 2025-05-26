import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import flash from 'connect-flash';
import session from 'express-session';
import passport from 'passport';
import morgan from 'morgan';
import nodemailer from 'nodemailer';
import favoriteSearch from './models/favoriteSearch';
import client from './meilisearch';
import dotenv from 'dotenv';
import './database';
import './passport/local-auth';

// Importar rutas al inicio
import indexRoutes from './routes/routes';

dotenv.config();

const app: Application = express();

// Configuraciones
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middlewares
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: 'mysecretsession',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req: Request, res: Response, next: NextFunction) => {
  app.locals.loginMessage = req.flash('loginMessage');
  app.locals.signupMessage = req.flash('signupMessage');
  app.locals.user = req.user;
  console.log(app.locals);
  next();
});

// Rutas principales
app.use('/', indexRoutes);

// Configuración del transporte de correos
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail(
  to: string,
  project: Record<string, any>
): Promise<void> {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Nuevo proyecto agregado que coincide con tu búsqueda',
    text: `Se ha encontrado un nuevo proyecto que coincide con tu búsqueda:
    Título: ${project.nombre || 'Sin título'}
    Descripción: ${project.descripcion || 'Sin descripcion'}
    Estado: ${project.estatus || 'Sin estado'}
    Ubicación: ${project.basedOn || 'Sin ubicación'}
    Área: ${project.granArea1 || 'Sin área'}
    Tipo: ${project.tipo || 'Sin tipo'}`,
  };

  await transporter.sendMail(mailOptions);
}

// Función para verificar búsquedas guardadas
async function checkSearches(): Promise<void> {
  try {
    const searches = await favoriteSearch.find();

    for (const search of searches) {
      const { searchQuery, estado, ubicacion, area, tipo, userEmail, _id } = search;
      const filters: string[] = [];
      if (estado) filters.push(`estatus = "${estado}"`);
      if (ubicacion) filters.push(`basedOn = "${ubicacion}"`);
      if (area) filters.push(`granArea1 = "${area}"`);
      if (tipo) filters.push(`tipo = "${tipo}"`);
      const filterString = filters.join(' AND ');

      const searchOptions: Record<string, any> = {};
      if (filterString) {
        searchOptions.filter = filterString;
      }

      const searchResults = await client.index('Proyectos').search(searchQuery || '', searchOptions);
      if (searchResults.hits.length > 0) {
        for (const hit of searchResults.hits) {
          const project = {
            nombre: hit.nombre || undefined,
            descripcion: hit.descripcion || undefined,
            estatus: hit.estatus || undefined,
            basedOn: hit.basedOn || undefined,
            granArea1: hit.granArea1 || undefined,
            tipo: hit.tipo || undefined,
          };
        
          if (!userEmail) {
            throw new Error('El correo del usuario no está definido');
          }
          await sendEmail(userEmail, hit);
        }
        await favoriteSearch.deleteOne({ _id });
      }
    }
  } catch (err) {
    console.error('Error checking searches:', err);
  }
}

// Ejecutar la función para verificar búsquedas
checkSearches().catch((err) => console.error(err));

// Los middlewares de error deben ir AL FINAL de todas las rutas
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ error: 'Página no encontrada' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
