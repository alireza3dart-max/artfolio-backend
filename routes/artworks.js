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

// Upload artwork با چند عکس
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  try {
    const { title, description, category, tags, price, software } = req.body;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }
    const imageUrls = req.files.map(f => f.path);
    const artwork = await Artwork.create({
      title,
      description,
      category,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      software: software ? software.split(',').map(s => s.trim()).filter(Boolean) : [],
      price: price || 0,
      img: imageUrls[0],
      images: imageUrls,
      artist: req.user.id,
    });
    const populated = await artwork.populate('artist', 'name avatar');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all artworks
router.get('/', async (req, res) => {
  try {
    const artworks = await Artwork.find()
      .populate('artist', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(artworks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get artwork by id
router.get('/:id', async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id)
      .populate('artist', 'name avatar');
    if (!artwork) return res.status(404).json({ message: 'Not found' });
    // افزایش views
    await Artwork.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json(artwork);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Like artwork
router.post('/:id/like', auth, async (req, res) => {
  try {
    const artwork = await Artwork.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );
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
    if (artwork.artist.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });
    for (const img of artwork.images || [artwork.img]) {
      const publicId = img.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`artfolio/${publicId}`);
    }
    await artwork.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;