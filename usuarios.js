const mongoose = require('mongoose');

// Definir el esquema
const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

// Definir el modelo
const User = mongoose.model('Usuarios', userSchema);

// Conectar a la base de datos
const uri = 'mongodb://mongodb:27017/myapp';
mongoose.connect(uri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Función para crear un nuevo usuario
async function createUser(username, password) {
  try {
    const user = new User({ username, password});
    const result = await user.save();
    console.log('New user created:', result);
  } catch (err) {
    console.error('Error creating user:', err);
  }
}

// Función para obtener todos los usuarios
async function getAllUsers() {
  try {
    const users = await User.find();
    console.log('All users:', users);
  } catch (err) {
    console.error('Error getting users:', err);
  }
}

// Función para actualizar un usuario por nombre
async function updateUserName(name, newData) {
  try {
    const updatedUser = await User.findOneAndUpdate({ name: name }, newData, { new: true });
    console.log('User updated:', updatedUser);
  } catch (err) {
    console.error('Error updating user:', err);
  }
}

// Función para eliminar un usuario por nombre
async function deleteUserName(name) {
  try {
    const deletedUser = await User.findOneAndDelete({ name: name });
    console.log('User deleted:', deletedUser);
  } catch (err) {
    console.error('Error deleting user:', err);
  } finally {
    await mongoose.connection.close();
  }
}

// Ejecutar las funciones CRUD
createUser('Alice', 'alice123');
createUser('Bob', 'bob123');
getAllUsers();
updateUserName('Alice', { name: 'Charlie'});
deleteUserName('Bob');
