const client = require('../meilisearch');
const fs = require('fs');
const path = require('path');

const configurarIndice = () => {
  // Eliminar índice existente
  client.deleteIndex('Proyectos');
  
  // Crear el nuevo índice
  client.createIndex('Proyectos', { primaryKey: 'id' });
  
  // Leer el archivo JSON de proyectos
  const proyectos = require('../data/proyectos.json');
  
  // Agregar los documentos al índice
  client.index('Proyectos').addDocuments(proyectos).then((res) => console.log(res)).catch((err) => console.error(err));

  // Actualizar configuraciones de atributos
  client.index('Proyectos').updateSettings({
    "rankingRules": [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness"
    ],
    distinctAttribute: 'id',
    searchableAttributes: [
      'id',
      'nombre',
      'tipo',
      'granArea1',
      'basedOn'
    ],
    displayedAttributes: [
      'id',
      'timestamp',
      'estatus',
      'daysLeft',
      'nombre',
      'tipo',
      'granArea1',
      'granArea2',
      'link',
      'descripcion',
      'fechaProximoDeadline',
      'basedOn'
    ],
    stopWords: [
      'de'
    ],
    sortableAttributes: [
      'nombre',
      'id'
    ],
    typoTolerance: {
      "enabled": true,
      "minWordSizeForTypos": {
        "oneTypo": 5,
        "twoTypos": 9
      }
    },
    pagination: {
      maxTotalHits: 100
    },
    faceting: {
      "maxValuesPerFacet": 100,
      "sortFacetValuesBy": {
        "*": "alpha"
      }
    },
    searchCutoffMs: 300
  });

  // Configuración de filtros
  client.index('Proyectos')
    .updateFilterableAttributes([
      'estatus',
      'basedOn',
      'granArea1',
      'tipo'
    ]);
};

module.exports = configurarIndice;
