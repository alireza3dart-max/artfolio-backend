const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { upload } = require('../middleware/upload');
const { sendEmail, emailTemplates } = require('../utils/email');
const passport = require('../config/passport');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
    if (name.length < 2 || name.length > 50) return res.status(400).json({ message: 'Name must be 2-50 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Invalid email format' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already exists' });
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email: email.toLowerCase(), password: hashed });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    sendEmail({
      to: email,
      subject: '🎨 Welcome to ArtFolio!',
      html: emailTemplates.welcome(name),
    });
    res.json({ token, user: { id: user._id, _id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'All fields required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'User not found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Wrong password' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, _id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Profile
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name, bio, location, website, twitter, instagram, role, avatar } = req.body;
    if (name && (name.length < 2 || name.length > 50)) return res.status(400).json({ message: 'Name must be 2-50 characters' });
    const user = await User.findByIdAndUpdate(
      decoded.id,
      { name, bio, location, website, twitter, instagram, role, avatar },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Upload Avatar
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByIdAndUpdate(
      decoded.id,
      { avatar: req.file.path },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Change Password
router.put('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'All fields required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const user = await User.findById(decoded.id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Current password is wrong' });
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    sendEmail({
      to: email,
      subject: '🔑 Reset Your ArtFolio Password',
      html: emailTemplates.resetPassword(user.name, resetLink),
    });
    res.json({ message: 'Reset email sent!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Follow / Unfollow
router.post('/follow/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.id === req.params.id) return res.status(400).json({ message: 'Cannot follow yourself' });
    const me = await User.findById(decoded.id);
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    const alreadyFollowing = me.followingList?.map(id => id.toString()).includes(req.params.id);
    if (alreadyFollowing) {
      me.followingList = me.followingList.filter(id => id.toString() !== req.params.id);
      me.following = Math.max(0, me.following - 1);
      target.followedBy = target.followedBy?.filter(id => id.toString() !== decoded.id);
      target.followers = Math.max(0, target.followers - 1);
    } else {
      me.followingList = [...(me.followingList || []), req.params.id];
      me.following += 1;
      target.followedBy = [...(target.followedBy || []), decoded.id];
      target.followers += 1;
      await Notification.create({
        recipient: req.params.id,
        sender: decoded.id,
        type: 'follow',
        message: 'started following you',
      });
      if (target.email) {
        sendEmail({
          to: target.email,
          subject: `👤 ${me.name} started following you on ArtFolio!`,
          html: emailTemplates.newFollower(target.name, me.name),
        });
      }
    }
    await me.save();
    await target.save();
    res.json({ following: !alreadyFollowing, followers: target.followers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get User by ID
router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== GOOGLE OAUTH =====

// Start Google login
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/auth?error=google` }),
  async (req, res) => {
    try {
      const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      const user = {
        id: req.user._id,
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
      };
      const userStr = encodeURIComponent(JSON.stringify(user));
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${userStr}`);
    } catch (err) {
      res.redirect(`${process.env.FRONTEND_URL}/auth?error=google`);
    }
  }
);

module.exports = router;