const mongoose = require('mongoose');

const mongodbURI = 'mongodb://mongodb:27017/login-node';

mongoose.connect(mongodbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000 
})
  .then(db => console.log('DB is connected'))
  .catch(err => console.error('Connection error', err));