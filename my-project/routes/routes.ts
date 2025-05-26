import { Router, type Request, type Response, type NextFunction } from 'express';
import passport from 'passport';
import '../passport/local-auth';
import favoriteSearch from '../models/favoriteSearch';
import fs from 'fs';
import path from 'path';
//import '../config/inicializacion-indice';
import configurarIndice from '../config/configuracion-indice';
import configurarIndicePeliculas from '../config/crear-indice';
import MeiliSearch from 'meilisearch';

const router = Router();

// Middleware para asegurar que el usuario esté autenticado
function isAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login'); // Redirige a la página de inicio de sesión si no está autenticado
}

// Ruta para crear el índice de películas (DEBE IR ANTES DE LAS RUTAS DE BÚSQUEDA)
router.post('/admin/crear-indice-peliculas', isAuthenticated, async (req: Request, res: Response) => {
  try {
    await configurarIndicePeliculas();
    res.json({ message: 'Índice creado exitosamente' });
  } catch (err: any) {
    console.error('Error al crear índice:', err);
    res.status(500).json({ error: err?.message || 'Error interno del servidor' });
  }
});

// Ruta para la página de inicio de sesión
router.get('/login', (req: Request, res: Response) => {
  res.render('login');
});

// Ruta para la página principal (ahora muestra los índices), protegida por autenticación
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  res.render('indices', { user: req.user });
});

// Ruta para la página de búsqueda específica de un índice
router.get('/buscar/:indice', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const client = new MeiliSearch({
      host: 'http://meilisearch:7700',
      apiKey: 'MASTER_KEY'
    });

    // Obtener la configuración del índice
    const settings = await client.index(req.params.indice).getSettings();
    
    // Obtener los valores únicos para cada atributo filtrable
    const filterableValues: { [key: string]: string[] } = {};
    for (const attr of settings.filterableAttributes || []) {
      const facetDistribution = await client.index(req.params.indice).search('', {
        facets: [attr],
        limit: 0
      });
      filterableValues[attr] = Object.keys(facetDistribution.facetDistribution?.[attr] || {});
    }

    res.render('index', { 
      user: req.user, 
      indice: req.params.indice,
      filterableAttributes: settings.filterableAttributes || [],
      filterableValues
    });
  } catch (error) {
    console.error('Error al obtener configuración del índice:', error);
    res.status(500).json({ error: 'Error al cargar la configuración del índice' });
  }
});

// Ruta para la página de registro
router.get('/signup', (req: Request, res: Response) => {
  res.render('signup');
});

// Ruta para logueo con Google
router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['email', 'profile'] })
);

// Ruta para logueo con Google (callback)
router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/login',
  })
);

// Ruta para la página de favoritos
router.get('/favoritos', isAuthenticated, (req: Request, res: Response) => {
  res.render('favoritos', { user: req.user });
});

// Manejo del registro de usuarios
router.post(
  '/signup',
  passport.authenticate('local-signup', {
    successRedirect: '/login',
    failureRedirect: '/signup',
    failureFlash: true,
  })
);

// Manejo del inicio de sesión
router.post(
  '/login',
  passport.authenticate('local-login', {
    successRedirect: '/', // Redirige a la página principal después de un inicio de sesión exitoso
    failureRedirect: '/login',
    failureFlash: true,
  })
);

// Manejo de cierre de sesión
router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout((err: any) => {
    if (err) {
      return next(err);
    }
    res.redirect('/login');
  });
});

// Manejo del envío de favoritos
router.post('/favoritos', isAuthenticated, (req: Request, res: Response) => {
  res.redirect('/favoritos');
});

// Guardado de proyectos favoritos
router.post('/setearFavoritos', isAuthenticated, async (req: Request, res: Response) => {
  const { searchQuery, Estado, Ubicacion, Area, Tipo } = req.body;
  const userEmail = req.user?.userEmail;

  const newSearch = new favoriteSearch({
    userEmail,
    searchQuery,
    createdAt: new Date(),
    estado: Estado,
    ubicacion: Ubicacion,
    area: Area,
    tipo: Tipo,
  });

  try {
    await newSearch.save();
    res.redirect('/favoritos');
  } catch (err) {
    console.error(err);
    res.redirect('/favoritos');
  }
});

// Ruta para la página de agregar proyectos
router.get('/agregar', isAuthenticated, (req: Request, res: Response) => {
  res.render('agregar', { user: req.user });
});

// Ruta para manejar el formulario de agregar proyectos
router.post('/agregar', isAuthenticated, (req: Request, res: Response) => {
  const filePath = path.join(__dirname, '../data/proyectos.json');
  const { nombre, tipo, estatus, basedOn, ...opcional } = req.body;

  // Validar campos obligatorios
  if (!nombre || !tipo || !estatus || !basedOn) {
    res.status(400).send('Faltan campos obligatorios');
    return;
  }

  // Leer el archivo JSON
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al leer los datos de proyectos');
    }

    let proyectos = JSON.parse(data);
    const nuevoId = proyectos.length ? proyectos[proyectos.length - 1].id + 1 : 1;

    const nuevoProyecto = {
      id: nuevoId,
      timestamp: new Date().toLocaleDateString('es-AR'),
      nombre,
      tipo,
      estatus,
      basedOn,
      ...opcional,
    };

    proyectos.push(nuevoProyecto);

    // Guardar el nuevo proyecto en el archivo
    fs.writeFile(filePath, JSON.stringify(proyectos, null, 2), (writeErr) => {
      if (writeErr) {
        console.error(writeErr);
        return res.status(500).send('Error al guardar el proyecto');
      }

      //require('../config/inicializacion-indice');
      configurarIndice();

      res.redirect('/agregar?success=true');
    });
  });
});

export default router;