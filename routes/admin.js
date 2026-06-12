const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Artwork = require('../models/Artwork');
const router = express.Router();

const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalArtworks = await Artwork.countDocuments();
    const totalLikes = await Artwork.aggregate([{ $group: { _id: null, total: { $sum: '$likes' } } }]);
    const totalViews = await Artwork.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]);
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('-password');
    const recentArtworks = await Artwork.find().sort({ createdAt: -1 }).limit(5).populate('artist', 'name avatar');
    res.json({
      totalUsers,
      totalArtworks,
      totalLikes: totalLikes[0]?.total || 0,
      totalViews: totalViews[0]?.total || 0,
      recentUsers,
      recentArtworks,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete user
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Artwork.deleteMany({ artist: req.params.id });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all artworks
router.get('/artworks', adminAuth, async (req, res) => {
  try {
    const artworks = await Artwork.find().populate('artist', 'name avatar').sort({ createdAt: -1 });
    res.json(artworks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete artwork
router.delete('/artworks/:id', adminAuth, async (req, res) => {
  try {
    await Artwork.findByIdAndDelete(req.params.id);
    res.json({ message: 'Artwork deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Make user admin
router.put('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;