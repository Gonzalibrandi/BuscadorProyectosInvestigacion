const client = require('../meilisearch');
const fs = require('fs');
const path = require('path');

const configurarIndicePeliculas = () => {
  // Eliminar índice existente si existe
  client.deleteIndex('Peliculas');
  
  // Crear el nuevo índice
  client.createIndex('Peliculas', { primaryKey: 'id' });
  
  // Datos de ejemplo de películas
  const peliculas = [
    {
      id: 1,
      titulo: "El Padrino",
      año: 1972,
      director: "Francis Ford Coppola",
      genero: ["Drama", "Crimen"],
      duracion: 175,
      rating: 9.2,
      sinopsis: "La historia de la familia Corleone, una de las más poderosas familias de la mafia italiana en Nueva York.",
      pais: "Estados Unidos"
    },
    {
      id: 2,
      titulo: "Pulp Fiction",
      año: 1994,
      director: "Quentin Tarantino",
      genero: ["Crimen", "Drama"],
      duracion: 154,
      rating: 8.9,
      sinopsis: "Varias historias entrelazadas de criminales en Los Ángeles.",
      pais: "Estados Unidos"
    },
    {
      id: 3,
      titulo: "El Secreto de sus Ojos",
      año: 2009,
      director: "Juan José Campanella",
      genero: ["Drama", "Misterio", "Romance"],
      duracion: 129,
      rating: 8.2,
      sinopsis: "Un oficial de justicia retirado escribe una novela sobre un caso de asesinato sin resolver de hace 25 años.",
      pais: "Argentina"
    },
    {
      id: 4,
      titulo: "Ciudad de Dios",
      año: 2002,
      director: "Fernando Meirelles",
      genero: ["Crimen", "Drama"],
      duracion: 130,
      rating: 8.6,
      sinopsis: "El ascenso del crimen organizado en las favelas de Río de Janeiro.",
      pais: "Brasil"
    },
    {
      id: 5,
      titulo: "Relatos Salvajes",
      año: 2014,
      director: "Damián Szifron",
      genero: ["Comedia", "Drama", "Suspenso"],
      duracion: 122,
      rating: 8.1,
      sinopsis: "Seis historias de violencia y venganza interconectadas.",
      pais: "Argentina"
    },
    {
      id: 6,
      titulo: "El Laberinto del Fauno",
      año: 2006,
      director: "Guillermo del Toro",
      genero: ["Drama", "Fantasía", "Guerra"],
      duracion: 118,
      rating: 8.2,
      sinopsis: "En la España de 1944, una niña escapa a un mundo fantástico para escapar de su cruel padrastro.",
      pais: "España"
    },
    {
      id: 7,
      titulo: "Amores Perros",
      año: 2000,
      director: "Alejandro González Iñárritu",
      genero: ["Drama", "Suspenso"],
      duracion: 154,
      rating: 8.1,
      sinopsis: "Tres historias distintas conectadas por un accidente automovilístico en Ciudad de México.",
      pais: "México"
    },
    {
      id: 8,
      titulo: "Todo Sobre Mi Madre",
      año: 1999,
      director: "Pedro Almodóvar",
      genero: ["Drama"],
      duracion: 101,
      rating: 7.9,
      sinopsis: "Una madre que perdió a su hijo busca al padre de este en Barcelona.",
      pais: "España"
    },
    {
      id: 9,
      titulo: "La Historia Oficial",
      año: 1985,
      director: "Luis Puenzo",
      genero: ["Drama", "Historia"],
      duracion: 112,
      rating: 7.8,
      sinopsis: "Una profesora descubre la verdad sobre su hija adoptada durante la dictadura argentina.",
      pais: "Argentina"
    },
    {
      id: 10,
      titulo: "El Ángel",
      año: 2018,
      director: "Luis Ortega",
      genero: ["Biografía", "Crimen", "Drama"],
      duracion: 118,
      rating: 7.1,
      sinopsis: "La historia del asesino serial más joven de Argentina.",
      pais: "Argentina"
    }
  ];
  
  // Agregar los documentos al índice
  client.index('Peliculas').addDocuments(peliculas)
    .then((res) => console.log('Índice de Películas creado:', res))
    .catch((err) => console.error('Error al crear índice de Películas:', err));

  // Configurar el índice
  client.index('Peliculas').updateSettings({
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness"
    ],
    distinctAttribute: 'id',
    searchableAttributes: [
      'titulo',
      'director',
      'genero',
      'sinopsis',
      'pais'
    ],
    displayedAttributes: [
      'id',
      'titulo',
      'año',
      'director',
      'genero',
      'duracion',
      'rating',
      'sinopsis',
      'pais'
    ],
    filterableAttributes: [
      'año',
      'genero',
      'pais',
      'rating'
    ],
    sortableAttributes: [
      'año',
      'rating',
      'duracion'
    ]
  });
};

module.exports = configurarIndicePeliculas;
