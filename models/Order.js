const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  artwork: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed', 'refunded'], default: 'completed' },
  coupon: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);