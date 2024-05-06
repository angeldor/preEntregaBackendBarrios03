import express from "express";
import { ProductManager, CartManager } from "../DAO/DB/ProductManager.js";
import mongoose from "mongoose";
import { productModel } from "../DAO/models/product.model.js";
import nodemailer from "nodemailer";
import transporter from "../App.js";
import crypto from "crypto";
import UsersDAO from "../DAO/DB/userManager.js";
import faker from "faker";
import { devLogger } from "../logger.js";

const router = express.Router();

const productManager = new ProductManager();
const cartManager = new CartManager();

mongoose.connection.on("error", (err) => {
  console.error("Error al conectarse a Mongo", +err);
});

router.get("/ping", (req, res) => {
  res.send("pong");
});

router.get("/current", async (req, res) => {
  try {
    const userId = req.user.id;
    const currentUser = await userManager.getCurrentUser(userId);
    res.json(currentUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// vistas
router.get("/", (req, res) => {
  res.redirect("/home");
});

router.get("/home", (req, res) => {
  if (req.session.user) {
    res.redirect("/profile");
  } else {
    res.render("home");
  }
});

router.get("/singup", (req, res) => {
  res.render("singup");
});

router.get("/login", (req, res) => {
  if (req.session.user) {
    res.redirect("/profile");
  } else {
    res.render("login");
  }
});

router.get("/profile", async (req, res) => {
  if (req.session.user) {
    let user = await UsersDAO.getUserByID(req.session.user);
    res.render("profile", { user });
  } else {
    res.redirect("/login");
  }
});

// sesiones

router.post("/singup", async (req, res) => {
  let first_name = req.body.first_name;
  let last_name = req.body.last_name;
  let email = req.body.email;
  let age = parseInt(req.body.age);
  let password = req.body.password;

  if (!first_name || !last_name || !email || !age || !password) {
    res.redirect("/singup");
  }

  let emailUsed = await UsersDAO.getUserByEmail(email);

  if (emailUsed) {
    res.redirect("/singup");
  } else {
    await UsersDAO.insert(first_name, last_name, age, email, password);
    res.redirect("/login");
  }
});

router.post("/login", async (req, res) => {
  let email = req.body.email;
  let password = req.body.password;

  if (!email || !password) {
    res.redirect("/login");
  }

  let user = await UsersDAO.getUserByCreds(email, password);

  if (!user) {
    res.redirect("/login");
  } else {
    req.session.user = user._id;
    res.redirect("/profile");
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    res.redirect("/home");
  });
});

// ProductManager

router.post("/products", async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      image,
      code,
      stock,
      category,
      thumbnails,
    } = req.body;
    if (!req.session.user || req.session.user.role !== "administrador") {
      return res.status(403).send("Acceso no autorizado");
    }
    const newProduct = await productManager.addProduct({
      title,
      description,
      price,
      image,
      code,
      stock,
      category,
      thumbnails,
    });

    res.status(201).send(newProduct);
  } catch (error) {
    res.status(400).send(`Error: ${error.message}`);
  }
});

router.put("/products/:id", async (req, res) => {
  const productId = req.params.id;
  const updatedFields = req.body;

  try {
    if (!req.session.user || req.session.user.role !== "administrador") {
      return res.status(403).send("Acceso no autorizado");
    }
    const updatedProduct = await productManager.updateProduct(
      productId,
      updatedFields
    );
    if (updatedProduct) {
      res.send(updatedProduct);
    } else {
      res.status(404).send(`Error 404: Producto no encontrado`);
    }
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

router.delete("/products/:id", async (req, res) => {
  const productId = req.params.id;

  try {
    if (!req.session.user || req.session.user.role !== "administrador") {
      return res.status(403).send("Acceso no autorizado");
    }
    await productManager.deleteProduct(productId);
    res.send(`Producto con ID ${productId} eliminado exitosamente.`);
  } catch (error) {
    res.status(404).send(`Error 404: ${error.message}`);
  }
});
// Crear una vista en el router de views ‘/products’
// para visualizar todos los productos con su respectiva paginación.
router.get("/products", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const { limit = 10, page = 1, sort, query } = req.query;

    const options = {
      limit: parseInt(limit, 10),
      page: parseInt(page, 10),
      sort: sort ? { price: sort === "asc" ? 1 : -1 } : null,
    };

    const categoryFilter = query
      ? { category: { $regex: new RegExp(query, "i") } }
      : {};

    const {
      docs: products,
      totalPages,
      page: currentPage,
      hasNextPage,
      hasPrevPage,
    } = await productModel.paginate(categoryFilter, options);

    let prevPage = currentPage > 1 ? currentPage - 1 : null;
    let nextPage = currentPage < totalPages ? currentPage + 1 : null;

    if (currentPage < 1 || currentPage > totalPages) {
      return res.status(404).send("Error 404: Página no encontrada");
    }

    let formattedProducts = products.map((product) => {
      return {
        title: product.title,
        description: product.description,
        price: product.price,
        image: product.image,
        category: product.category,
      };
    });

    res.render("product", {
      productData: formattedProducts,
      totalPages,
      currentPage,
      hasNextPage,
      hasPrevPage,
      prevPage,
      nextPage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/products/:id", async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await productManager.getProductById(productId);

    if (product) {
      res.send(product);
    } else {
      res.status(404).send("Error 404: Product not found");
    }
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

router.get("/api/carts", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "administrador") {
      return res.status(403).send("Acceso no autorizado");
    }
    let carts = await cartManager.getAllCarts();

    const limit = req.query.limit;

    if (limit) {
      carts = carts.slice(0, parseInt(limit, 10));
    }

    res.send(carts);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

router.post("/api/carts", async (req, res) => {
  try {
    if (req.session.user && req.session.user.role === "administrador") {
      return res.status(403).send("Acceso no autorizado para administradores");
    }
    const newCartId = await cartManager.createCart();
    res.status(201).send({ id: newCartId, items: [], total: 0 });
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

router.get("/api/carts/:cid", async (req, res) => {
  const cartId = req.params.cid;

  try {
    const cart = await cartManager.getCart(cartId);

    if (cart) {
      const productsDetails = [];

      for (const item of cart.items) {
        const product = await productManager.getProductById(item.productId);
        if (product) {
          productsDetails.push({ product, quantity: item.quantity });
        }
      }
      let formattedProducts = productsDetails.map((item) => {
        return {
          title: item.product.title,
          description: item.product.description,
          price: item.product.price,
        };
      });
      let cartTotal = cart.total;
      res.render("cart", { cart, formattedProducts, cartTotal });
    } else {
      res.status(404).send(`Error 404: Cart with ID ${cartId} not found.`);
    }
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

router.post("/api/carts/:cid/products/:pid", async (req, res) => {
  try {
    const { cid, pid } = req.params;
    const { quantity } = req.body;
    if (!req.session.user || req.session.user.cartId !== cid) {
      return res.status(403).send("Acceso no autorizado para este carrito");
    }
    const cart = await cartManager.addToCart(cid, pid, quantity);
    res.status(200).json({ status: "success", payload: cart });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});
//No encontre manera de eliminar productos de mi carrito
//Según Postman tengo conflictos con el total del carrito
router.delete("/api/carts/:cid/products/:pid", async (req, res) => {
  try {
    const { cid, pid } = req.params;
    if (!req.session.user || req.session.user.cartId !== cid) {
      return res.status(403).send("Acceso no autorizado para este carrito");
    }

    await cartManager.removeFromCart(cid, pid);

    return res.json({
      status: "success",
      message: "Product removed from cart successfully.",
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

router.put("/api/carts/:cid", async (req, res) => {
  try {
    const { cid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(cid)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid cart ID" });
    }

    const { products } = req.body;

    if (!Array.isArray(products)) {
      return res
        .status(400)
        .json({ status: "error", message: "Products should be an array" });
    }

    console.log("Cart ID:", cid);

    const updatedCart = await cartManager.updateCart(cid, products);

    res.json({
      status: "success",
      message: "Cart updated successfully",
      cart: updatedCart,
    });
  } catch (error) {
    console.error("Error updating cart:", error.message);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});
//////////////////////////Ticket//////////////////////////
router.post("/carts/:cid/purchase", async (req, res) => {
  const cartId = req.params.cid;
  try {
    const cart = await cartManager.getCart(cartId);
    if (!cart) {
      return res
        .status(404)
        .send(`Error 404: Cart with ID ${cartId} not found.`);
    }
    const productsNotPurchased = [];
    for (const item of cart.items) {
      const product = await productManager.getProductById(item.productId);
      if (!product) {
        return res
          .status(404)
          .send(`Error 404: Product with ID ${item.productId} not found.`);
      }
      if (product.stock >= item.quantity) {
        product.stock -= item.quantity;
        await product.save();
      } else {
        productsNotPurchased.push(item.productId);
      }
    }
    cart.items = cart.items.filter(
      (item) => !productsNotPurchased.includes(item.productId)
    );
    cart.total = cart.items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );
    await cart.save();

    const ticket = await ticketManager.createTicket({
      code: generateUniqueCode(),
      amount: cart.total,
      purchaser: req.session.user.email,
      products: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      productsNotPurchased: productsNotPurchased,
    });

    return res
      .status(200)
      .json({ status: "success", ticket, productsNotPurchased });
  } catch (error) {
    return res.status(500).send(`Error: ${error.message}`);
  }
});

//////////////////////////Mocking//////////////////////////

// Endpoint para productos falsos
app.get("/mockingproducts", (req, res) => {
  try {
    const numberOfProducts = 100;
    const fakeProducts = Array.from({ length: numberOfProducts }, () => ({
      title: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price()),
      image: faker.image.imageUrl(),
      code: faker.datatype.uuid(),
      stock: faker.datatype.number({ min: 1, max: 100 }),
      status: true,
      category: faker.commerce.department(),
      thumbnails: [faker.image.imageUrl(), faker.image.imageUrl()],
    }));

    res.status(200).json(fakeProducts);
  } catch (error) {
    res.status(500).json({ message: "Error al generar productos falsos" });
  }
});

router.get("/loggerTest", (req, res) => {
  devLogger.debug("Debug message");
  devLogger.info("Information message");
  devLogger.warn("Warning message");
  devLogger.error("Error message");
  devLogger.fatal("Fatal message");
  res.send("Logs generated successfully");
});

////////////////////////// password recovery //////////////////////////

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    const token = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // Expira en 1 hora
    await user.save();

    const resetLink = `http://example.com/reset-password/${token}`;

    const mailOptions = {
      from: "your@example.com",
      to: user.email,
      subject: "Restablecer contraseña",
      text: `Para restablecer tu contraseña, haz clic en el siguiente enlace: ${resetLink}`,
    };

    await transporter.sendMail(mailOptions);

    res
      .status(200)
      .json({
        message:
          "Correo electrónico de restablecimiento de contraseña enviado.",
      });
  } catch (error) {
    console.error(
      "Error al enviar el correo electrónico de restablecimiento de contraseña:",
      error
    );
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

export default router;
