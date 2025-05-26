import { google } from 'googleapis';
import { readFileSync } from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import client from '../meilisearch';

dotenv.config();

const SHEET_ID = process.argv[2];
const SHEET_RANGE = process.argv[3] || 'A1:Z1000';
const INDEX_NAME = 'Proyectos';

if (process.argv.includes('--reset')) {
  await resetearIndice();
}

async function resetearIndice() {
  try {
    await client.deleteIndex('Proyectos');
    console.log('Índice "Proyectos" eliminado.');
  } catch (err) {
    console.error('No se pudo eliminar el índice:', err.message);
  }
}

async function leerDatosDeSheet() {
  const auth = new google.auth.GoogleAuth({
    credentials: require('../google-sheet-credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SHEET_RANGE,
  });

  const [headers, ...rows] = response.data.values!;
  const documentos = rows.map((row, idx) => {
    const doc: Record<string, any> = {};
    headers.forEach((header, i) => {
      doc[header] = row[i] ?? null;
    });
    if (!doc["id"]) doc["id"] = `auto-${idx}`;
    return doc;
  });

  return { headers, documentos };
}

async function crearIndice(headers: string[]) {
  await client.createIndex(INDEX_NAME, { primaryKey: 'id' });

  await client.index(INDEX_NAME).updateSettings({
    searchableAttributes: headers,
    displayedAttributes: headers,
    sortableAttributes: headers.filter(h => h.toLowerCase().includes('fecha') || h.toLowerCase().includes('nombre')),
    filterableAttributes: headers.filter(h =>
      ['estatus', 'basedOn', 'granArea1', 'tipo'].includes(h)
    ),
  });

  console.log("✔️ Índice creado con configuración dinámica.");
}

function compararArrays(arr1: string[], arr2: string[]) {
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  const dif1 = [...set1].filter(x => !set2.has(x));
  const dif2 = [...set2].filter(x => !set1.has(x));
  return { iguales: dif1.length === 0 && dif2.length === 0, dif1, dif2 };
}

async function cargar() {
  const { headers, documentos } = await leerDatosDeSheet();

  try {
    const index = await client.getIndex(INDEX_NAME);

    const config = await index.getSettings();
    const actuales = config.searchableAttributes;

    const { iguales, dif1, dif2 } = compararArrays(actuales, headers);

    if (!iguales) {
      console.error("❌ Las columnas no coinciden con el índice existente.");
      console.error("→ Faltan en el nuevo set:", dif1);
      console.error("→ Faltan en el índice existente:", dif2);
      return;
    }

    await index.addDocuments(documentos);
    console.log(`✔️ ${documentos.length} documentos agregados al índice existente.`);

  } catch (err: any) {
    if (err.code === 'index_not_found' || err.message?.includes("not found")) {
      console.log("⚠️ Índice no encontrado. Se creará uno nuevo.");
      await crearIndice(headers);
      await client.index(INDEX_NAME).addDocuments(documentos);
      console.log(`✔️ ${documentos.length} documentos insertados en el nuevo índice.`);
    } else {
      console.error("❌ Error inesperado:", err);
    }
  }
}

cargar().catch(console.error);
