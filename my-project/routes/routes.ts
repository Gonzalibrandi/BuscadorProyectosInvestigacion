import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import passport from 'passport';
import '../passport/local-auth';
import favoriteSearch from '../models/favoriteSearch';
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

// Guardado de búsquedas favoritas
router.post('/setearFavoritos', isAuthenticated, async (req: Request, res: Response) => {
  const { indice, ...criterios } = req.body;
  const userEmail = req.user?.userEmail;

  // Verificar que haya al menos un criterio
  if (Object.keys(criterios).length === 0) {
    return res.status(400).json({ error: 'Debes especificar al menos un criterio de búsqueda' });
  }

  const newSearch = new favoriteSearch({
    userEmail,
    indice,
    createdAt: new Date(),
    criterios
  });

  try {
    await newSearch.save();
    res.json({ message: 'Búsqueda guardada exitosamente' });
  } catch (err) {
    console.error('Error al guardar búsqueda:', err);
    res.status(500).json({ error: 'Error al guardar la búsqueda' });
  }
});

// Ruta para obtener las búsquedas favoritas del usuario
router.get('/favoritos/mis-busquedas', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userEmail = req.user?.userEmail;
    if (!userEmail) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    const busquedas = await favoriteSearch.find({ userEmail }).select('_id indice criterios createdAt activa userEmail');
    res.json(busquedas);
  } catch (error) {
    console.error('Error al obtener búsquedas favoritas:', error);
    res.status(500).json({ error: 'Error al obtener búsquedas favoritas' });
  }
});

// Ruta para eliminar una búsqueda favorita
router.delete('/favoritos/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userEmail = req.user?.userEmail;

    if (!userEmail) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Buscar y eliminar la búsqueda, asegurándose de que pertenece al usuario autenticado
    const result = await favoriteSearch.deleteOne({ _id: id, userEmail: userEmail });

    if (result.deletedCount === 0) {
      // Si deletedCount es 0, o no se encontró la búsqueda o no pertenecía al usuario
      const existingSearch = await favoriteSearch.findById(id);
      if (existingSearch) {
         return res.status(403).json({ error: 'No tienes permiso para eliminar esta búsqueda' });
      } else {
         return res.status(404).json({ error: 'Búsqueda no encontrada' });
      }
    }

    res.json({ message: 'Búsqueda eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar búsqueda favorita:', error);
    res.status(500).json({ error: 'Error al eliminar la búsqueda' });
  }
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

// Ruta para agregar un documento a un índice
router.post('/admin/indices/:uid/documentos', isAuthenticated, (async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const documento = req.body;

    // Validar que el documento tenga al menos un campo
    if (Object.keys(documento).length === 0) {
      return res.status(400).json({ error: 'El documento no puede estar vacío' });
    }

    // Obtener el índice
    const index = client.index(uid);

    // Agregar el documento al índice y obtener la tarea
    const task = await index.addDocuments([documento]);

    res.json({ 
      message: 'Solicitud de documento recibida. Procesando indexación...', // Mensaje más preciso
      taskUid: task.taskUid // Devolver el UID de la tarea
    });
  } catch (error: any) {
    console.error('Error al agregar documento:', error);
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

// Ruta para obtener el estado de una tarea de MeiliSearch
router.get('/admin/indices/:uid/tasks/:taskUid', isAuthenticated, (async (req: Request, res: Response) => {
  try {
    const { taskUid } = req.params;
    const task = await client.getTask(parseInt(taskUid, 10));
    res.json(task);
  } catch (error: any) {
    console.error('Error al obtener estado de la tarea:', error);
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

export default router;