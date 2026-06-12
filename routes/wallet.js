const express = require('express');
const jwt = require('jsonwebtoken');
const Wallet = require('../models/Wallet');
const router = express.Router();

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ message: 'Invalid token' }); }
};

// Get or create wallet
router.get('/', auth, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) wallet = await Wallet.create({ user: req.user.id });
    res.json(wallet);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Add payment method
router.post('/payment-method', auth, async (req, res) => {
  try {
    const { type, label, last4 } = req.body;
    if (!type || !label) return res.status(400).json({ message: 'Type and label required' });

    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) wallet = await Wallet.create({ user: req.user.id });

    const isFirst = wallet.paymentMethods.length === 0;
    wallet.paymentMethods.push({ type, label, last4: last4 || '', isDefault: isFirst });
    await wallet.save();
    res.json(wallet);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Remove payment method
router.delete('/payment-method/:index', auth, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
    wallet.paymentMethods.splice(req.params.index, 1);
    await wallet.save();
    res.json(wallet);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Set default payment method
router.put('/payment-method/:index/default', auth, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user.id });
    wallet.paymentMethods.forEach((pm, i) => { pm.isDefault = i === Number(req.params.index); });
    await wallet.save();
    res.json(wallet);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Deposit (simulate)
router.post('/deposit', auth, async (req, res) => {
  try {
    const { amount, paymentMethodIndex } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });
    if (amount > 10000) return res.status(400).json({ message: 'Max deposit is $10,000' });

    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) wallet = await Wallet.create({ user: req.user.id });

    wallet.balance += Number(amount);
    wallet.transactions.push({
      type: 'deposit',
      amount: Number(amount),
      description: `Deposit via ${wallet.paymentMethods[paymentMethodIndex]?.label || 'payment method'}`,
      status: 'completed',
      reference: `DEP-${Date.now()}`,
    });
    await wallet.save();
    res.json(wallet);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Withdrawal (simulate)
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount, paymentMethodIndex } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet || wallet.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });
    if (amount < 10) return res.status(400).json({ message: 'Minimum withdrawal is $10' });

    wallet.balance -= Number(amount);
    wallet.transactions.push({
      type: 'withdrawal',
      amount: Number(amount),
      description: `Withdrawal to ${wallet.paymentMethods[paymentMethodIndex]?.label || 'payment method'}`,
      status: 'completed',
      reference: `WIT-${Date.now()}`,
    });
    await wallet.save();
    res.json(wallet);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get transactions
router.get('/transactions', auth, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) return res.json([]);
    res.json(wallet.transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;