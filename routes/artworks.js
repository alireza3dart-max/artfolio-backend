const express = require('express');
const jwt = require('jsonwebtoken');
const { upload, cloudinary } = require('../middleware/upload');
const Artwork = require('../models/Artwork');
const Notification = require('../models/Notification');
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
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  try {
    const { title, description, category, tags, price, software } = req.body;
    if (!title || title.trim().length < 2) return res.status(400).json({ message: 'Title must be at least 2 characters' });
    if (title.length > 100) return res.status(400).json({ message: 'Title too long (max 100 chars)' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'At least one image required' });
    if (price && (isNaN(price) || price < 0 || price > 10000)) return res.status(400).json({ message: 'Invalid price' });
    const imageUrls = req.files.map(f => f.path);
    const artwork = await Artwork.create({
      title: title.trim(),
      description: description?.trim() || '',
      category: category || 'Other',
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 10) : [],
      software: software ? software.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10) : [],
      price: Math.max(0, Math.min(10000, Number(price) || 0)),
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
    const artworks = await Artwork.find().populate('artist', 'name avatar').sort({ createdAt: -1 });
    res.json(artworks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get artwork by id
router.get('/:id', async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id).populate('artist', 'name avatar _id');
    if (!artwork) return res.status(404).json({ message: 'Not found' });
    await Artwork.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json(artwork);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle Like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id).populate('artist', '_id');
    if (!artwork) return res.status(404).json({ message: 'Not found' });
    const alreadyLiked = artwork.likedBy?.map(id => id.toString()).includes(req.user.id);
    if (alreadyLiked) {
      artwork.likes = Math.max(0, artwork.likes - 1);
      artwork.likedBy = artwork.likedBy.filter(id => id.toString() !== req.user.id);
    } else {
      artwork.likes += 1;
      artwork.likedBy = [...(artwork.likedBy || []), req.user.id];
      if (artwork.artist._id.toString() !== req.user.id) {
        await Notification.create({
          recipient: artwork.artist._id,
          sender: req.user.id,
          type: 'like',
          message: 'liked your artwork',
          artwork: artwork._id,
        });
      }
    }
    await artwork.save();
    res.json({ likes: artwork.likes, liked: !alreadyLiked });
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