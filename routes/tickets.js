const express = require('express');
const jwt = require('jsonwebtoken');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('../utils/email');
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
    const { subject, message, priority, category } = req.body;
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
      priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      category: category || 'general',
    });

    // Confirm email to user
    const user = await User.findById(req.user.id);
    if (user?.email) {
      sendEmail({
        to: user.email,
        subject: `🎫 Ticket Received: ${subject}`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0d0b1a;color:#f0eeff;border-radius:16px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#7c5cfc,#4f8ef7);padding:32px;text-align:center;">
              <h1 style="margin:0;font-size:26px;">🎧 Ticket Submitted</h1>
            </div>
            <div style="padding:36px;">
              <h2 style="color:#f0eeff;">Hi ${user.name},</h2>
              <p style="color:#a89ec8;">We received your support ticket and will respond within 2-4 hours.</p>
              <div style="background:#1a1730;border:1px solid #2d2850;border-radius:12px;padding:20px;margin:20px 0;">
                <p style="color:#7c5cfc;font-weight:700;margin:0 0 8px;">Subject:</p>
                <p style="color:#f0eeff;margin:0;">${subject}</p>
              </div>
              <div style="text-align:center;margin-top:24px;">
                <a href="https://artfolio-frontend-lac.vercel.app/support" style="background:linear-gradient(135deg,#7c5cfc,#4f8ef7);color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;">View My Tickets</a>
              </div>
            </div>
            <div style="padding:20px;text-align:center;border-top:1px solid #2d2850;">
              <p style="color:#6b6488;font-size:12px;">© 2024 ArtFolio Inc.</p>
            </div>
          </div>
        `,
      });
    }

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

// Admin reply to ticket
router.put('/:id/reply', auth, async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply || reply.trim().length < 2) return res.status(400).json({ message: 'Reply required' });

    const ticket = await Ticket.findById(req.params.id).populate('user', 'name email');
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.adminReply = reply.trim();
    ticket.status = 'closed';
    ticket.repliedAt = new Date();
    await ticket.save();

    // Send reply email to user
    if (ticket.user?.email) {
      sendEmail({
        to: ticket.user.email,
        subject: `🎧 Reply to your ticket: ${ticket.subject}`,
        html: emailTemplates.ticketReply(ticket.user.name, ticket.subject, reply),
      });
    }

    res.json(ticket);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get all tickets (admin)
router.get('/all', auth, async (req, res) => {
  try {
    const tickets = await Ticket.find().populate('user', 'name email avatar').sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;