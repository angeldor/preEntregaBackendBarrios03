import Users from "../models/user.model.js";
import UserDTO from "../../DTO/UserDTO.js";

class UserManager {
  async getCurrentUser(userId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const { username, email, roles } = user;
    return new UserDTO(username, email, roles);
  }
}
class UsersDAO {
  static async getUserByEmail(email) {
    return await Users.findOne({ email });
  }

  static async getUserByCreds(email, password) {
    return await Users.findOne({ email, password });
  }

  static async insert(first_name, last_name, age, email, password) {
    return await new Users({
      first_name,
      last_name,
      age,
      email,
      password,
    }).save();
  }

  static async getUserByID(id) {
    return await Users.findOne(
      { _id: id },
      { first_name: 1, last_name: 1, age: 1, email: 1 }
    ).lean();
  }
  static async changeUserRole(userId, newRole) {
    try {
      // Buscar el usuario por su ID
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`User with id ${userId} not found.`);
      }

      // Cambiar el rol del usuario
      user.role = newRole;

      // Guardar el usuario actualizado en la base de datos
      await user.save();

      return user;
    } catch (error) {
      throw error;
    }
  }
}

async function registerUser(req, res) {
  const { first_name, last_name, age, email, password, role } = req.body;

  try {
    // Verificar si el correo electrónico ya está en uso
    const existingUser = await UserRepository.getUserByEmail(email);
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "El correo electrónico ya está en uso." });
    }

    // Crear el nuevo usuario con el rol especificado
    const newUser = await UserRepository.insertUser(
      first_name,
      last_name,
      age,
      email,
      password,
      role
    );

    res
      .status(201)
      .json({ message: "Usuario registrado exitosamente.", user: newUser });
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
}

export { UsersDAO, UserManager, registerUser };
