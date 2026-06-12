const express = require('express');
const jwt = require('jsonwebtoken');
const Ticket = require('../models/Ticket');
const router = express.Router();

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ message: 'Invalid token' }); }
};

// ارسال تیکت
router.post('/', auth, async (req, res) => {
  try {
    const { subject, message, priority } = req.body;
    const ticket = await Ticket.create({ user: req.user.id, subject, message, priority: priority || 'medium' });
    res.json(ticket);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// تیکت‌های کاربر
router.get('/my', auth, async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;