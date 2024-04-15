import { urlencoded } from "express";
import express from "express";
import __dirname from "./utils.js";
import handlebars from "express-handlebars";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import router from "./Routes/router.js";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "./passport.config.js";
import dotenv from "dotenv";

dotenv.config();



const mongoUrl = process.env.MONGO_URL;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

const app = express();
const httpServer = app.listen(8080, () =>
  console.log("Server running on port 8080")
);

mongoose.connect(mongoUrl);

mongoose.connection.on("error", (err) => {
  console.error("Error al conectarse a Mongo", +err);
});

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(
  session({
    store: MongoStore.create({
      mongoUrl: "mongodb://localhost:27017/ecommerce",
      ttl: 15,
    }),
    secret: "codigosecreto",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + "/public"));
app.use(express.json());

app.use("/", router);

// app.use((req, res, next) => {
//     const { user } = req.session
//     const path = req.path
//     if (!user && path !== '/login') {
//         return res.redirect('/login')
//     }
//     next()
// })

app.use((req, res, next) => {
  if (!req.isAuthenticated() && req.originalUrl !== "/login") {
    res.redirect("/login");
  } else {
    next();
  }
});

app.engine("handlebars", handlebars.engine());
app.set("views", __dirname + "/views");
app.set("view engine", "handlebars");
