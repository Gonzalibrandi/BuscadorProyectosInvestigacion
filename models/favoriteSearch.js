const mongoose = require('mongoose');
const { Schema } = mongoose;

//Esquema de busqueda favorita
const favoriteSearchSchema = new Schema({
  userEmail: String,
  searchQuery: String,
  createdAt: Date,
  estado: String,
  ubicacion: String,
  area: String,
  tipo: String
});

module.exports = mongoose.model('favoriteSearch', favoriteSearchSchema);