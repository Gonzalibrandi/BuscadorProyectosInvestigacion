const mongoose = require('mongoose');
const { Schema } = mongoose;

const noResultsSearchSchema = new Schema({
  userEmail: String,
  searchQuery: String,
  createdAt: Date,
  estado: String,
  ubicacion: String,
  area: String,
  tipo: String
});

module.exports = mongoose.model('noResultsSearch', noResultsSearchSchema);