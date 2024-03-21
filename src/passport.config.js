import passport from "passport"
import { Strategy as LocalStrategy } from "passport-local"
import UsersDAO from "./DAO/DB/userManager.js"

passport.use(
    new LocalStrategy(async (email, password, done) => {
        try {
            const user = await UsersDAO.getUserByCreds(email, password)
            if (!user) {
                return done(null, false, { message: 'Correo electrónico o contraseña incorrectos' })
            }
            return done(null, user)
        } catch (error) {
            return done(error)
        }
    }
))

passport.serializeUser((user, done) => {
    done(null, user._id)
})

passport.deserializeUser(async (id, done) => {
    try {
        const user = await UsersDAO.getUserByID(id)
        done(null, user)
    } catch (error) {
        done(error)
    }
})

export default passport