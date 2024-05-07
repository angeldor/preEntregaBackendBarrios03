import UsersDAO from "./userManager.js";

class UserRepository {
  static async getUserByEmail(email) {
    return await UsersDAO.getUserByEmail(email);
  }

  static async getUserByCreds(email, password) {
    return await UsersDAO.getUserByCreds(email, password);
  }

  static async insertUser(first_name, last_name, age, email, password, role) {
    return await new User({
      first_name,
      last_name,
      age,
      email,
      password,
      role, // Nuevo campo de rol
    }).save();
  }

  static async getUserById(userId) {
    return await UsersDAO.getUserByID(userId);
  }
}

export default UserRepository;
