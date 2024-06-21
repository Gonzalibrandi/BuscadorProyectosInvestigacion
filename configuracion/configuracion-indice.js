const { MeiliSearch } = require('meilisearch'); //Importación

//configurar conexión con Meilisearch
const client = new MeiliSearch({
  host: 'http://meilisearch:7700',
  apiKey: 'MASTER_KEY'
});

//tomamos el archivo proyectos y creamos un indice con ese mismo nombre y con el archivo
/* 
client.deleteIndex('Proyectos');
client.createIndex('Proyectos', { primaryKey: 'id' })
const proyectos = require('./datos/proyectos.json');
client.index('Proyectos').addDocuments(proyectos).then((res) => console.log(res)).catch((err) => console.error(err));
 */

//actualizacion de atributos displayed
/*
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
      'descripcion',
      'timestamp',
      'fechaProximoDeadline',
      'tipo',
      'granArea1'
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
      'fechaProximoDeadline'
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
})
*/

//filtros
/* 
client.index('Proyectos')
  .updateFilterableAttributes([
    'estatus'
  ]) 

client.index('Proyectos').search('', {
  filter: 'estatus = "Vencido"'
})

/* offset */