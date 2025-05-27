import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import passport from 'passport';
import '../passport/local-auth';
import favoriteSearch from '../models/favoriteSearch';
import fs from 'fs';
import path from 'path';
//import '../config/inicializacion-indice';
import configurarIndice from '../config/configuracion-indice';
import configurarIndicePeliculas from '../config/crear-indice';
import MeiliSearch from 'meilisearch';
import { google } from 'googleapis';
import client from '../meilisearch';

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
  res.render('indices', { 
    title: 'Índices Disponibles',
    user: req.user 
  });
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

// Ruta para obtener todos los índices
router.get('/admin/indices', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const indices = await client.getIndexes();
    // Asegurarnos de que devolvemos un array
    const indicesArray = Array.isArray(indices) ? indices : (indices.results || []);
    res.json(indicesArray);
  } catch (error: any) {
    console.error('Error al obtener índices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para obtener las columnas de un Google Sheet
router.post('/admin/obtener-columnas', isAuthenticated, (async (req: Request, res: Response) => {
  const { sheetId, sheetRange } = req.body;

  if (!sheetId) {
    res.status(400).json({ error: 'ID del sheet es requerido' });
    return;
  }

  try {
    // Configurar autenticación de Google
    const auth = new google.auth.GoogleAuth({
      credentials: require('../google-sheet-credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Leer solo la primera fila para obtener los nombres de las columnas
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: sheetRange || 'A1:Z1',
    });

    if (!response.data.values || response.data.values.length === 0) {
      res.status(400).json({ 
        error: 'No se encontraron columnas en el sheet' 
      });
      return;
    }

    // Devolver los nombres de las columnas (primera fila)
    const columnas = response.data.values[0].filter(Boolean); // Filtrar valores vacíos
    res.json({ columnas });

  } catch (error: any) {
    console.error('Error al obtener columnas:', error);
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

// Ruta para crear un nuevo índice desde Google Sheets
router.post('/admin/crear-indice', isAuthenticated, (async (req: Request, res: Response) => {
  const { nombre, sheetId, sheetRange, columnasFiltrables } = req.body;

  if (!nombre || !sheetId) {
    res.status(400).json({ error: 'Nombre del índice y ID del sheet son requeridos' });
    return;
  }

  if (!columnasFiltrables || columnasFiltrables.length === 0) {
    res.status(400).json({ error: 'Debe seleccionar al menos una columna filtrable' });
    return;
  }

  try {
    // Configurar autenticación de Google
    const auth = new google.auth.GoogleAuth({
      credentials: require('../google-sheet-credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Leer datos del sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: sheetRange || 'A1:Z1000',
    });

    if (!response.data.values || response.data.values.length < 2) {
      return res.status(400).json({ 
        error: 'El sheet debe contener al menos una fila de encabezados y una fila de datos' 
      });
    }

    const [headers, ...rows] = response.data.values;

    // Crear documentos
    const documentos = rows.map((row, idx) => {
      const doc: Record<string, any> = {};
      headers.forEach((header, i) => {
        doc[header] = row[i] ?? null;
      });
      if (!doc["id"]) doc["id"] = `${nombre}-${idx}`;
      return doc;
    });

    // Crear o actualizar el índice
    try {
      await client.createIndex(nombre, { primaryKey: 'id' });
    } catch (err: any) {
      if (!err.message?.includes('already exists')) {
        throw err;
      }
    }

    // Configurar el índice con las columnas filtrables seleccionadas
    await client.index(nombre).updateSettings({
      searchableAttributes: headers,
      displayedAttributes: headers,
      sortableAttributes: headers.filter(h => 
        h.toLowerCase().includes('fecha') || 
        h.toLowerCase().includes('nombre')
      ),
      filterableAttributes: columnasFiltrables,
    });

    // Agregar documentos
    await client.index(nombre).addDocuments(documentos);

    return res.json({ 
      message: 'Índice creado exitosamente',
      stats: {
        documentos: documentos.length,
        campos: headers.length,
        camposFiltrables: columnasFiltrables.length
      }
    });

  } catch (error: any) {
    console.error('Error al crear índice:', error);
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

// Ruta para eliminar un índice
router.delete('/admin/indices/:uid', isAuthenticated, (async (req: Request, res: Response) => {
  try {
    await client.deleteIndex(req.params.uid);
    res.json({ message: 'Índice eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error al eliminar índice:', error);
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

// Ruta para renombrar un índice
router.put('/admin/indices/:uid/rename', isAuthenticated, (async (req: Request, res: Response) => {
  const { newName } = req.body;
  const { uid } = req.params;

  if (!newName) {
    res.status(400).json({ error: 'El nuevo nombre es requerido' });
    return;
  }

  try {
    // MeiliSearch no tiene una operación directa de renombrado,
    // así que tenemos que crear un nuevo índice y copiar los datos
    const sourceIndex = await client.getIndex(uid);
    const documents = await sourceIndex.getDocuments({ limit: 100000 }); // Ajusta el límite según necesites
    const settings = await sourceIndex.getSettings();

    // Crear nuevo índice con el nuevo nombre
    await client.createIndex(newName, { primaryKey: 'id' });
    const newIndex = client.index(newName);

    // Copiar configuración
    await newIndex.updateSettings(settings);

    // Copiar documentos si existen
    if (documents.results.length > 0) {
      await newIndex.addDocuments(documents.results);
    }

    // Eliminar índice original
    await client.deleteIndex(uid);

    return res.json({ 
      message: 'Índice renombrado exitosamente',
      newUid: newName
    });
  } catch (error: any) {
    console.error('Error al renombrar índice:', error);
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

// Ruta para obtener la configuración de un índice
router.get('/admin/indices/:uid/config', isAuthenticated, (async (req: Request, res: Response) => {
  try {
    const index = client.index(req.params.uid);
    const settings = await index.getSettings();
    
    res.json({
      searchableAttributes: settings.searchableAttributes || [],
      filterableAttributes: settings.filterableAttributes || [],
      sortableAttributes: settings.sortableAttributes || [],
      displayedAttributes: settings.displayedAttributes || []
    });
  } catch (error: any) {
    console.error('Error al obtener configuración del índice:', error);
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

// Ruta para obtener estadísticas de un índice
router.get('/admin/indices/:uid/stats', isAuthenticated, (async (req: Request, res: Response) => {
  try {
    const index = client.index(req.params.uid);
    const stats = await index.getStats();
    const settings = await index.getSettings();
    
    res.json({
      numberOfDocuments: stats.numberOfDocuments,
      fieldCount: settings.displayedAttributes?.length || 0
    });
  } catch (error: any) {
    console.error('Error al obtener estadísticas del índice:', error);
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

export default router;