import Users from "../models/user.model.js"

class UsersDAO {

    static async getUserByEmail(email){
        return await Users.findOne({email})
    }

    static async getUserByCreds(email, password) {
        return await Users.findOne({email, password})
    }

    static async insert(first_name, last_name, age, email, password) {
        return await new Users({first_name, last_name, age, email, password}).save()
    }

    static async getUserByID(id) {
        return await Users.findOne({_id:id},{first_name:1, last_name:1, age:1, email:1}).lean()
    }

}

export default UsersDAO