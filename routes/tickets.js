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

// Submit ticket
router.post('/', auth, async (req, res) => {
  try {
    const { subject, message, priority } = req.body;
    if (!subject || subject.trim().length < 3) return res.status(400).json({ message: 'Subject must be at least 3 characters' });
    if (subject.length > 100) return res.status(400).json({ message: 'Subject too long' });
    if (!message || message.trim().length < 10) return res.status(400).json({ message: 'Message must be at least 10 characters' });
    if (message.length > 2000) return res.status(400).json({ message: 'Message too long' });
    const openTickets = await Ticket.countDocuments({ user: req.user.id, status: { $ne: 'closed' } });
    if (openTickets >= 5) return res.status(400).json({ message: 'Too many open tickets. Please wait for a reply first.' });
    const ticket = await Ticket.create({
      user: req.user.id,
      subject: subject.trim(),
      message: message.trim(),
      priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium'
    });
    res.json(ticket);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get my tickets
router.get('/my', auth, async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;