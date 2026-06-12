const express = require('express');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const router = express.Router();

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ message: 'Invalid token' }); }
};

// Get all conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user.id }, { recipient: req.user.id }]
    }).populate('sender', 'name avatar').populate('recipient', 'name avatar').sort({ createdAt: -1 });

    // گروه‌بندی بر اساس conversation
    const conversations = {};
    messages.forEach(msg => {
      const otherId = msg.sender._id.toString() === req.user.id
        ? msg.recipient._id.toString()
        : msg.sender._id.toString();
      const otherUser = msg.sender._id.toString() === req.user.id ? msg.recipient : msg.sender;

      if (!conversations[otherId]) {
        conversations[otherId] = {
          user: otherUser,
          lastMessage: msg,
          unread: 0,
        };
      }
      if (!msg.read && msg.recipient._id.toString() === req.user.id) {
        conversations[otherId].unread++;
      }
    });

    res.json(Object.values(conversations));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get messages with a specific user
router.get('/:userId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, recipient: req.params.userId },
        { sender: req.params.userId, recipient: req.user.id }
      ]
    }).populate('sender', 'name avatar').populate('recipient', 'name avatar').sort({ createdAt: 1 });

    // Mark as read
    await Message.updateMany(
      { sender: req.params.userId, recipient: req.user.id, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Send message
router.post('/', auth, async (req, res) => {
  try {
    const { recipientId, text } = req.body;
    if (!recipientId || !text) return res.status(400).json({ message: 'Missing fields' });
    const message = await Message.create({
      sender: req.user.id,
      recipient: recipientId,
      text,
    });
    const populated = await message.populate('sender', 'name avatar');

    // Send notification
    await Notification.create({
      recipient: recipientId,
      sender: req.user.id,
      type: 'system',
      message: 'sent you a message',
    });

    res.json(populated);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get unread count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({ recipient: req.user.id, read: false });
    res.json({ count });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Search users to message
router.get('/search/users', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const users = await User.find({
      name: { $regex: q, $options: 'i' },
      _id: { $ne: req.user.id }
    }).select('name avatar').limit(8);
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;