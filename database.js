const mongoose = require('mongoose');
const { mongodb } = require('./keys');

mongoose.connect(mongodb.URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 segundos de timeout para la selección del servidor
  socketTimeoutMS: 45000 // 45 segundos de timeout para los sockets
})
  .then(db => console.log('DB is connected'))
  .catch(err => console.error('Connection error', err));