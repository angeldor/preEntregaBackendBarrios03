import { cartModel } from "../models/cart.model.js"
import { productModel } from "../models/product.model.js"
import mongoose from 'mongoose'



class ProductManager {
    async addProduct({
        title,
        description,
        price,
        image,
        code,
        stock,
        status = true,
        category,
        thumbnails = [],
    }) {
        // Validar campos obligatorios
        if (!title || !description || !price || !image || !code || !stock) {
            throw new Error("All fields are required.")
        }

        // Validar que el código no esté repetido
        const existingProduct = await productModel.findOne({ code })
        if (existingProduct) {
            throw new Error(`Product with code ${code} already exists.`)
        }

        // Agregar producto con id autoincrementable
        const newProduct = new productModel({
            id: ++this.lastProductId,
            title,
            description,
            price,
            image,
            code,
            stock,
            status,
            category,
            thumbnails,
        })

        await newProduct.save()
        return newProduct
    }

    async getProducts() {
        return productModel.find()
    }

    async getProductById(id) {
        return productModel.findById(id)
    }

    async updateProduct(productId, updatedProduct) {
        const product = await productModel.findById(productId);
        if (!product) {
            throw new Error(`Product with id ${productId} not found.`)
        }
        Object.assign(product, updatedProduct)

        await product.save()

        return product
    }

    async deleteProduct(productId) {
        const product = await productModel.findById(productId);
        if (!product) {
            throw new Error(`Product with id ${productId} not found.`)
        }
        await product.deleteOne()
    }
}

class CartManager {
    async createCart() {
        const newCart = new cartModel({ items: [], total: 0 })
        await newCart.save()
        return newCart._id
    }

    async getCart(cartId) {
        return cartModel.findById(cartId)
    }

    async getAllCarts() {
        return cartModel.find()
    }

    async addToCart(cartId, productId, quantity = 1) {
        const cart = await cartModel.findById(cartId)
        if (!cart) {
            throw new Error(`Cart with id ${cartId} not found.`)
        }

        const product = await productModel.findById(productId)
        if (!product) {
            throw new Error(`Product with id ${productId} not found.`)
        }

        const subtotal = product.price * quantity
        cart.items.push({ productId, quantity })

        cart.total += subtotal

        await cart.save()

        return cart
    }
//No encontre manera de eliminar productos de mi carrito
//Según Postman tengo conflictos con el total del carrito
    async removeFromCart(cid, pid) {
        const cart = await cartModel.findById(cid);
        if (!cart) {
            throw new Error(`Cart with id ${cid} not found.`)
        }

        const itemIndex = cart.items.findIndex(item => item.productId.equals(pid))

        if (itemIndex !== -1) {
            const { price, quantity } = cart.items[itemIndex]
            const subtotal = price * quantity

            cart.total -= subtotal
            cart.items.splice(itemIndex, 1)

            await cart.save()
        } else {
            throw new Error(`Product with id ${pid} not found in the cart.`)
        }
    }

    async updateCart(cartId) {
        if (!mongoose.Types.ObjectId.isValid(cartId)) {
            throw new Error(`Invalid cart ID: ${cartId}`)
        }
    
        try {
            const cart = await cartModel.findById(cartId)
    
            if (!cart) {
                throw new Error(`Cart with id ${cartId} not found.`)
            }
    
            let newTotal = 0
            for (const item of cart.items) {
                const product = await productModel.findById(item.productId)
                if (product) {
                    newTotal += product.price * item.quantity
                }
            }
    
            cart.total = newTotal
            await cart.save()
    
            console.log(`Cart with id ${cartId} updated successfully.`)
            return cart
        } catch (error) {
            console.error('Error updating cart:', error.message)
            throw error
        }
    }

}

export { ProductManager, CartManager }

