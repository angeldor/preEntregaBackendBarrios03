import express from 'express'
import { ProductManager, CartManager } from '../DAO/DB/ProductManager.js'
import mongoose from 'mongoose'
import { productModel } from '../DAO/models/product.model.js'
// import { cartModel } from '../DAO/models/cart.model.js'
// import { userModel } from '../DAO/models/user.model.js'
import UsersDAO from '../DAO/DB/userManager.js'
import passport from '../passport.config.js'

const router = express.Router()

const productManager = new ProductManager()
const cartManager = new CartManager()

mongoose.connection.on("error", err => {
    console.error("Error al conectarse a Mongo", + err)
})

router.get("/ping", (req, res) => {
    res.send("pong")
})

router.get('/api/sessions/current', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ user: req.user })
    } else {
        res.json({ user: null })
    }
})
// vistas
router.get('/', (req, res) => {
    res.redirect('/home')
})

router.get('/home', (req, res) => {

    if (req.session.user) {
        res.redirect("/profile")
    } else {
        res.render("home")
    }

})

router.get("/singup", (req, res) => {
    res.render('singup')
})

router.get("/login", (req, res) => {

    if (req.session.user) {
        res.redirect("/profile")
    } else {
        res.render("login")
    }

})

router.get("/profile", async (req, res) => {
    if (req.session.user) {

        let user = await UsersDAO.getUserByID(req.session.user)
        res.render("profile", { user })

    } else {
        res.redirect("/login")
    }
})

// sesiones

router.post("/singup", async (req, res) => {

    let first_name = req.body.first_name
    let last_name = req.body.last_name
    let email = req.body.email
    let age = parseInt(req.body.age)
    let password = req.body.password

    if (!first_name || !last_name || !email || !age || !password) {
        res.redirect("/singup")
    }

    let emailUsed = await UsersDAO.getUserByEmail(email)

    if (emailUsed) {
        res.redirect("/singup")
    } else {
        await UsersDAO.insert(first_name, last_name, age, email, password)
        res.redirect("/login")
    }

})

router.post("/login", async (req, res) => {

    let email = req.body.email
    let password = req.body.password

    if (!email || !password) {
        res.redirect("/login")
    }

    let user = await UsersDAO.getUserByCreds(email, password)

    if (!user) {
        res.redirect("/login")
    } else {
        req.session.user = user._id
        res.redirect("/profile")
    }

})

router.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        res.redirect("/home")
    })
})

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
        } = req.body

        const newProduct = await productManager.addProduct({
            title,
            description,
            price,
            image,
            code,
            stock,
            category,
            thumbnails,
        })

        res.status(201).send(newProduct)
    } catch (error) {
        res.status(400).send(`Error: ${error.message}`)
    }

})

router.put("/products/:id", async (req, res) => {
    const productId = req.params.id
    const updatedFields = req.body

    try {
        const updatedProduct = await productManager.updateProduct(productId, updatedFields)
        res.send(updatedProduct)
    } catch (error) {
        res.status(404).send(`Error 404: ${error.message}`)
    }
})

router.delete("/products/:id", async (req, res) => {
    const productId = req.params.id

    try {
        await productManager.deleteProduct(productId)
        res.send(`Product with ID ${productId} deleted successfully.`)
    } catch (error) {
        res.status(404).send(error.message)
    }
})
// Crear una vista en el router de views ‘/products’ 
// para visualizar todos los productos con su respectiva paginación.
router.get("/products.html", async (req, res) => {
    try {

        if (!req.session.user) {
            return res.redirect('/login')
        }

        const { limit = 10, page = 1, sort, query } = req.query

        const options = {
            limit: parseInt(limit, 10),
            page: parseInt(page, 10),
            sort: sort ? { price: sort === 'asc' ? 1 : -1 } : null
        }

        const categoryFilter = query ? { category: { $regex: new RegExp(query, 'i') } } : {}

        const { docs: products, totalPages, page: currentPage, hasNextPage, hasPrevPage } = await productModel.paginate(categoryFilter, options)

        let prevPage = currentPage > 1 ? currentPage - 1 : null
        let nextPage = currentPage < totalPages ? currentPage + 1 : null

        if (currentPage < 1 || currentPage > totalPages) {
            return res.status(404).send("Error 404: Página no encontrada")
        }

        let formattedProducts = products.map(product => {
            return {
                title: product.title,
                description: product.description,
                price: product.price,
                image: product.image,
                category: product.category,
            }
        })

        res.render('product', { productData: formattedProducts, totalPages, currentPage, hasNextPage, hasPrevPage, prevPage, nextPage })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
//El método GET deberá devolver un objeto con el siguiente formato:
// {
// 	status:success/error
// payload: Resultado de los productos solicitados
// totalPages: Total de páginas
// prevPage: Página anterior
// nextPage: Página siguiente
// page: Página actual
// hasPrevPage: Indicador para saber si la página previa existe
// hasNextPage: Indicador para saber si la página siguiente existe.
// prevLink: Link directo a la página previa (null si hasPrevPage=false)
// nextLink: Link directo a la página siguiente (null si hasNextPage=false)
// }
router.get("/products.json", async (req, res) => {
    try {
        const { limit = 10, page = 1, sort, query } = req.query

        const options = {
            limit: parseInt(limit, 10),
            page: parseInt(page, 10),
            sort: sort ? { price: sort === 'asc' ? 1 : -1 } : null
        }

        const categoryFilter = query ? { category: { $regex: new RegExp(query, 'i') } } : {}

        const { docs: products, totalPages, page: currentPage, hasNextPage, hasPrevPage } = await productModel.paginate(categoryFilter, options)

        let formattedProducts = products.map(product => {
            return {
                title: product.title,
                description: product.description,
                price: product.price,
                image: product.image
            }
        })

        res.status(200).json({
            status: 'success',
            payload: formattedProducts,
            totalPages,
            page: currentPage,
            hasNextPage,
            hasPrevPage
        })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.get("/products/:id", async (req, res) => {
    const productId = req.params.id

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
})

router.get("/api/carts", async (req, res) => {
    try {
        let carts = await cartManager.getAllCarts();

        const limit = req.query.limit;

        if (limit) {
            carts = carts.slice(0, parseInt(limit, 10));
        }

        res.send(carts);
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`);
    }
})

router.post("/api/carts", async (req, res) => {
    try {
        const newCartId = await cartManager.createCart()
        res.status(201).send({ id: newCartId, items: [], total: 0 })
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`)
    }
})
// Además, agregar una vista en ‘/carts/:cid (cartId) 
// para visualizar un carrito específico, 
// donde se deberán listar SOLO los productos que pertenezcan a dicho carrito.
router.get("/api/carts/:cid", async (req, res) => {
    const cartId = req.params.cid

    try {
        const cart = await cartManager.getCart(cartId)

        if (cart) {
            const productsDetails = []

            for (const item of cart.items) {
                const product = await productManager.getProductById(item.productId)
                if (product) {
                    productsDetails.push({ product, quantity: item.quantity })
                }
            }
            let formattedProducts = productsDetails.map(item => {
                return {
                    title: item.product.title,
                    description: item.product.description,
                    price: item.product.price
                }
            })
            let cartTotal = cart.total
            res.render('cart', { cart, formattedProducts, cartTotal })
        } else {
            res.status(404).send(`Error 404: Cart with ID ${cartId} not found.`)
        }
    } catch (error) {
        res.status(500).send(`Error: ${error.message}`)
    }
})

router.post("/api/carts/:cid/products/:pid", async (req, res) => {

    try {

        const { cid, pid } = req.params
        const { quantity } = req.body

        const cart = await cartManager.addToCart(cid, pid, quantity)
        res.status(200).json({ status: 'success', payload: cart })
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message })
    }
})
//No encontre manera de eliminar productos de mi carrito
//Según Postman tengo conflictos con el total del carrito
router.delete("/api/carts/:cid/products/:pid", async (req, res) => {
    try {
        const { cid, pid } = req.params

        await cartManager.removeFromCart(cid, pid)

        return res.json({ status: "success", message: "Product removed from cart successfully." })
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message })
    }
})

router.put("/api/carts/:cid", async (req, res) => {
    try {
        const { cid } = req.params

        if (!mongoose.Types.ObjectId.isValid(cid)) {
            return res.status(400).json({ status: "error", message: "Invalid cart ID" })
        }

        const { products } = req.body

        if (!Array.isArray(products)) {
            return res.status(400).json({ status: "error", message: "Products should be an array" })
        }

        console.log("Cart ID:", cid)

        const updatedCart = await cartManager.updateCart(cid, products)

        res.json({ status: "success", message: "Cart updated successfully", cart: updatedCart })
    } catch (error) {
        console.error("Error updating cart:", error.message)
        res.status(500).json({ status: "error", message: "Internal server error" })
    }
})

export default router