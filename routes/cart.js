const express = require('express');
const jwt = require('jsonwebtoken');
const Artwork = require('../models/Artwork');
const router = express.Router();

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// در حافظه نگه می‌داریم (برای production باید MongoDB استفاده کنی)
const carts = {};

// Get Cart
router.get('/', auth, (req, res) => {
  const cart = carts[req.user.id] || [];
  res.json(cart);
});

// Add to Cart
router.post('/add', auth, async (req, res) => {
  try {
    const { artworkId } = req.body;
    const artwork = await Artwork.findById(artworkId).populate('artist', 'name avatar');
    if (!artwork) return res.status(404).json({ message: 'Artwork not found' });

    if (!carts[req.user.id]) carts[req.user.id] = [];
    const exists = carts[req.user.id].find(item => item._id === artworkId);
    if (exists) return res.status(400).json({ message: 'Already in cart' });

    const cartItem = {
      _id: artwork._id,
      title: artwork.title,
      img: artwork.img,
      price: artwork.price || 0,
      artist: artwork.artist?.name || 'Unknown',
      category: artwork.category,
    };

    carts[req.user.id].push(cartItem);
    res.json({ message: 'Added to cart', cart: carts[req.user.id] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove from Cart
router.delete('/remove/:artworkId', auth, (req, res) => {
  if (!carts[req.user.id]) return res.json({ cart: [] });
  carts[req.user.id] = carts[req.user.id].filter(item => item._id.toString() !== req.params.artworkId);
  res.json({ message: 'Removed', cart: carts[req.user.id] });
});

// Clear Cart
router.delete('/clear', auth, (req, res) => {
  carts[req.user.id] = [];
  res.json({ message: 'Cart cleared' });
});

module.exports = router;