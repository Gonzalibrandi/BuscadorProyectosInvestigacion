import { Schema, model, Document } from 'mongoose';

// Define la interfaz del usuario
export interface IUser extends Document {
  userEmail: string;
  username: string;
  password: string;
  googleId: string;
  comparePassword(password: string): boolean;
}

const userSchema = new Schema<IUser>({
  userEmail: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: false }, 
  googleId: { type: String, required: false },
});


// Método para comparar contraseñas
userSchema.methods.comparePassword = function (password: string): boolean {
  if (!this.password) return false;
  return password === this.password;
};


export default model<IUser>('User', userSchema);
