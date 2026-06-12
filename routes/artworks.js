const express = require('express');
const jwt = require('jsonwebtoken');
const { upload, cloudinary } = require('../middleware/upload');
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

// Upload artwork
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, tags, price } = req.body;
    const artwork = await Artwork.create({
      title,
      description,
      category,
      tags: tags ? tags.split(',') : [],
      price: price || 0,
      img: req.file.path,
      artist: req.user.id,
    });
    res.json(artwork);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all artworks
router.get('/', async (req, res) => {
  try {
    const artworks = await Artwork.find().populate('artist', 'name avatar').sort({ createdAt: -1 });
    res.json(artworks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get artwork by id
router.get('/:id', async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id).populate('artist', 'name avatar');
    if (!artwork) return res.status(404).json({ message: 'Not found' });
    res.json(artwork);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete artwork
router.delete('/:id', auth, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);
    if (!artwork) return res.status(404).json({ message: 'Not found' });
    if (artwork.artist.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    await cloudinary.uploader.destroy(artwork.img.split('/').pop().split('.')[0]);
    await artwork.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;