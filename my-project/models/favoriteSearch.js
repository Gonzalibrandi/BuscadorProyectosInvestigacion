const mongoose = require('mongoose');
const { Schema } = mongoose;

// Esquema de búsqueda favorita
const favoriteSearchSchema = new Schema({
  userEmail: String,
  indice: String, // Nombre del índice al que pertenece la búsqueda
  createdAt: Date,
  criterios: Schema.Types.Mixed, // Almacena los criterios de búsqueda de forma dinámica
  activa: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('favoriteSearch', favoriteSearchSchema);