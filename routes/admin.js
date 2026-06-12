const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Artwork = require('../models/Artwork');
const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');
const Order = require('../models/Order');
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

// Stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalArtworks = await Artwork.countDocuments();
    const totalTickets = await Ticket.countDocuments();
    const openTickets = await Ticket.countDocuments({ status: 'open' });
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalLikes = await Artwork.aggregate([{ $group: { _id: null, total: { $sum: '$likes' } } }]);
    const totalViews = await Artwork.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]);
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('-password');
    const recentArtworks = await Artwork.find().sort({ createdAt: -1 }).limit(5).populate('artist', 'name avatar');
    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).populate('buyer', 'name avatar').populate('artwork', 'title img price');
    res.json({
      totalUsers, totalArtworks, totalTickets, openTickets,
      totalOrders, totalRevenue: totalRevenue[0]?.total || 0,
      totalLikes: totalLikes[0]?.total || 0,
      totalViews: totalViews[0]?.total || 0,
      recentUsers, recentArtworks, recentOrders,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Artwork.deleteMany({ artist: req.params.id });
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Artworks
router.get('/artworks', adminAuth, async (req, res) => {
  try {
    const artworks = await Artwork.find().populate('artist', 'name avatar').sort({ createdAt: -1 });
    res.json(artworks);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/artworks/:id', adminAuth, async (req, res) => {
  try {
    await Artwork.findByIdAndDelete(req.params.id);
    res.json({ message: 'Artwork deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Tickets
router.get('/tickets', adminAuth, async (req, res) => {
  try {
    const tickets = await Ticket.find().populate('user', 'name avatar email').sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/tickets/:id', adminAuth, async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, {
      status: req.body.status,
      adminReply: req.body.adminReply,
      repliedAt: new Date(),
    }, { new: true }).populate('user', 'name avatar email');
    res.json(ticket);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/tickets/:id', adminAuth, async (req, res) => {
  try {
    await Ticket.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ticket deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Comments
router.get('/comments', adminAuth, async (req, res) => {
  try {
    const comments = await Comment.find().populate('user', 'name avatar').populate('artwork', 'title img').sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/comments/:id', adminAuth, async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(comment);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/comments/:id', adminAuth, async (req, res) => {
  try {
    await Comment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Comment deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Orders
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('buyer', 'name avatar email')
      .populate('seller', 'name')
      .populate('artwork', 'title img price')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/orders/:id', adminAuth, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;