import mongoose from "mongoose";

const UsersSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["usuario", "premium"], // Definir los roles permitidos
    default: "usuario", // Valor predeterminado
  },
});

export default mongoose.model("Users", UsersSchema);
