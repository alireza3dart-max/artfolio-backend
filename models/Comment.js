const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  artwork: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork', required: true },
  text: { type: String, required: true },
  status: { type: String, enum: ['visible', 'hidden'], default: 'visible' },
  likes: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);