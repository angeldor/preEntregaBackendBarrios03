import UsersDAO from "./userManager.js";

class UserRepository {
    static async getUserByEmail(email) {
        return await UsersDAO.getUserByEmail(email);
    }

    static async getUserByCreds(email, password) {
        return await UsersDAO.getUserByCreds(email, password);
    }

    static async insertUser(first_name, last_name, age, email, password) {
        return await UsersDAO.insert(first_name, last_name, age, email, password);
    }

    static async getUserById(userId) {
        return await UsersDAO.getUserByID(userId);
    }
}

export default UserRepository;
