const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['like', 'follow', 'comment', 'purchase', 'system'], required: true },
  message: { type: String, required: true },
  artwork: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' },
  read: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);