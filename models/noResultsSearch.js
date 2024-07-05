const mongoose = require('mongoose');

const { Schema } = mongoose;

const noResultsSearchSchema = new Schema({
  userEmail: { type: String, required: true },
  searchQuery: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('noResultsSearch', noResultsSearchSchema);