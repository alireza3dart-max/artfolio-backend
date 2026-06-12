const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['deposit', 'withdrawal', 'sale', 'purchase', 'refund'], required: true },
  amount: { type: Number, required: true },
  description: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  reference: { type: String },
}, { timestamps: true });

const walletSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  balance: { type: Number, default: 0 },
  transactions: [transactionSchema],
  paymentMethods: [{
    type: { type: String, enum: ['card', 'paypal', 'crypto', 'bank'] },
    label: String,
    last4: String,
    isDefault: { type: Boolean, default: false },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);