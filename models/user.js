const mongoose = require('mongoose');
// const bcrypt = require('bcrypt-nodejs');
// const { compare } = require('bcrypt');

const { Schema } = mongoose;

const userSchema = new Schema({
  username: String,
  password: String
});

/* userSchema.methods.encryptPassword = function(password) {
   console.log(bcrypt.hashSync(password, bcrypt.genSaltSync(10)))
   return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
}; */

userSchema.methods.comparePassword = function(password) {
  console.log(password)
  console.log(this.password)
  // return bcrypt.compareSync(password, this.password);
  return password === this.password;
};


module.exports = mongoose.model('user', userSchema);