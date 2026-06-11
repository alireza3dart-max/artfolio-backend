const express = require('express');
const multer = require('multer');
const path = require('path');
const Artwork = require('../models/Artwork');
const auth = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Get all artworks
router.get('/', async (req, res) => {
  try {
    const artworks = await Artwork.find().populate('artist', 'name avatar').sort('-createdAt');
    res.json(artworks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Upload artwork
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, tags } = req.body;
    const artwork = await Artwork.create({
      title,
      description,
      category,
      tags: tags ? tags.split(',') : [],
      image: req.file.filename,
      artist: req.user.id
    });
    res.json(artwork);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Like artwork
router.put('/:id/like', auth, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);
    const liked = artwork.likes.includes(req.user.id);
    if (liked) {
      artwork.likes = artwork.likes.filter(id => id.toString() !== req.user.id);
    } else {
      artwork.likes.push(req.user.id);
    }
    await artwork.save();
    res.json(artwork);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;