import { UsersDAO } from './DAO';

class UsersController {
  static async changeUserRole(req, res, next) {
    const userId = req.params.userId;
    const newRole = req.body.role;

    try {
      // Lógica para cambiar el rol del usuario
      const updatedUser = await UsersDAO.changeUserRole(userId, newRole);
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  }
}

export default UsersController;
