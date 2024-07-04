const mongoose = require('mongoose');

const noResultsSearchSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  searchQuery: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NoResultsSearch', noResultsSearchSchema);