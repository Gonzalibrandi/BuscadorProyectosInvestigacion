const client = require('../meilisearch');

//Se establece el nuevo indice. Se elimina el actual y se crea y asigna el nuevo
client.deleteIndex('Proyectos');
client.createIndex('Proyectos', { primaryKey: 'id' });
const proyectos = require('../data/proyectos.json');
client.index('Proyectos').addDocuments(proyectos).then((res) => console.log(res)).catch((err) => console.error(err));

//Actualizacion de atributos mostrados en el localhost:7700
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
  synonyms: {
      
  },
  typoTolerance: {
      "enabled": true,
      "minWordSizeForTypos": {
        "oneTypo": 5,
        "twoTypos": 9
      },
      "disableOnWords": [],
      "disableOnAttributes": []
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

//seteo de filtros
client.index('Proyectos')
  .updateFilterableAttributes([
    'estatus',
    'basedOn',
    'granArea1',
    'tipo'
]);