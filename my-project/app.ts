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

// Importar rutas
import routes from './routes/routes';

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
  res.locals.messages = {
    error: req.flash('error'),
    success: req.flash('success'),
    info: req.flash('info'),
    warning: req.flash('warning')
  };
  res.locals.loginMessage = req.flash('loginMessage');
  res.locals.signupMessage = req.flash('signupMessage');
  res.locals.user = req.user;
  next();
});

// Rutas
app.use('/', routes);

// Configuración del transporte de correos
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Función para enviar email
async function sendEmail(
  to: string,
  documento: Record<string, any>,
  criterios: Record<string, any>,
  indice: string
): Promise<void> {
  // Crear el cuerpo del email con los campos que coincidieron
  const camposCoincidentes = Object.entries(criterios)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n    ');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `[${indice}] Nuevo documento que coincide con tu búsqueda`,
    text: `¡Hola!

  Se ha encontrado un nuevo documento en el índice "${indice}" que coincide con tus criterios de búsqueda.

  📋 Criterios de búsqueda:
      ${camposCoincidentes}

  📄 Detalles del documento:
      ${Object.entries(documento)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n    ')}

Recibirás notificaciones cada vez que se encuentren nuevos documentos que coincidan con tus criterios de búsqueda.

Saludos,
Sistema de Búsqueda de Proyectos de Investigación`,
  };

  try {
    console.log(`Intentando enviar correo a ${to}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado: %s', info.messageId);
  } catch (error) {
    console.error('Error al enviar correo:', error);
  }
}

// Función para verificar búsquedas guardadas
async function checkSearches(): Promise<void> {
  try {
    console.log('Ejecutando checkSearches para verificar búsquedas guardadas...');
    console.log('HOLA');
    const searches = await favoriteSearch.find({ activa: true });

    for (const search of searches) {
      try {
        const { indice, criterios, userEmail, _id } = search;
        
        if (!indice || !criterios || !userEmail) {
          console.warn('Búsqueda inválida (faltan campos):', search);
          continue;
        }
        
        // Log para depurar: mostrar qué búsqueda se está procesando
        console.log(`Procesando búsqueda favorita: ID=${_id}, Índice=${indice}, Criterios=${JSON.stringify(criterios)}, Usuario=${userEmail}`);

        // Construir los filtros para MeiliSearch
        const filters = Object.entries(criterios)
          .map(([key, value]) => `${key} = "${value}"`)
          .join(' AND ');

        const searchOptions: Record<string, any> = {};
        if (filters) {
          searchOptions.filter = filters;
        }

        // Buscar en el índice correspondiente
        const searchResults = await client.index(indice).search('', searchOptions);
        
        if (searchResults.hits.length > 0) {
          console.log(`Coincidencia encontrada para búsqueda ID=${_id}. Enviando correo...`);
          for (const hit of searchResults.hits) {
            await sendEmail(userEmail, hit, criterios, indice);
          }
          console.log(`Búsqueda ID=${_id} procesada. Manteniendo activa para futuras notificaciones.`);
        } else {
          console.log(`No se encontraron coincidencias para búsqueda ID=${_id}. Manteniendo activa.`);
        }
      } catch (error) {
        console.error(`Error al procesar búsqueda ID=${search?._id}:`, error);
        // Continuar con la siguiente búsqueda en caso de error
      }
    }
  } catch (err) {
    console.error('Error general checking searches:', err);
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
