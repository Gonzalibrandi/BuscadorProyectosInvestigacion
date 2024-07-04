const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema({
  userEmail: String,
  username: String,
  password: String
});

userSchema.methods.comparePassword = function(password) {
  return password === this.password;
};

module.exports = mongoose.model('user', userSchema);