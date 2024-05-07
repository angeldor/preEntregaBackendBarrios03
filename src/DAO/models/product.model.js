import mongoose from 'mongoose'
import mongoosePaginate from 'mongoose-paginate-v2'

const productCollection = 'products'

const productSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    image: String,
    code: {
        type: String,
        unique: true
    },
    stock: Number,
    status: { type: Boolean, default: true },
    category: String,
    thumbnails: [String],
    owner: {
        type: String,
        default: 'admin',
        required: function() {
            // Solo requerido para usuarios premium
            return this.isUserPremium;
        }
    }
})

productSchema.plugin(mongoosePaginate)

export const productModel = mongoose.model(productCollection, productSchema)