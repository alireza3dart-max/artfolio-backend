const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ message: 'Invalid token' }); }
};

// Get payment methods
router.get('/methods', (req, res) => {
  res.json({
    paypal: { clientId: process.env.PAYPAL_CLIENT_ID, currency: 'USD' },
    crypto: [
      { name: 'USDT (TRC20)', symbol: 'USDT', network: 'TRC20', address: process.env.USDT_TRC20, icon: '💵' },
      { name: 'Bitcoin', symbol: 'BTC', network: 'Bitcoin', address: process.env.BTC_ADDRESS, icon: '₿' },
      { name: 'TRON', symbol: 'TRX', network: 'TRON', address: process.env.TRON_ADDRESS, icon: '🔴' },
    ],
  });
});

// Create PayPal order
router.post('/paypal/create', auth, async (req, res) => {
  try {
    const { amount, artworkId } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const auth64 = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');

    const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth64}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('PayPal auth failed');

    const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: String(parseFloat(amount).toFixed(2)) },
          description: `ArtFolio Purchase - Artwork #${artworkId}`,
        }],
        application_context: {
          return_url: `${process.env.FRONTEND_URL}/payment/success`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        },
      }),
    });

    const orderData = await orderRes.json();
    res.json({ orderId: orderData.id, status: orderData.status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Capture PayPal order
router.post('/paypal/capture', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: 'Order ID required' });

    const auth64 = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');

    const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth64}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });

    const tokenData = await tokenRes.json();

    const captureRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
    });

    const captureData = await captureRes.json();
    if (captureData.status === 'COMPLETED') {
      res.json({ success: true, data: captureData });
    } else {
      res.status(400).json({ message: 'Payment not completed' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submit crypto payment
router.post('/crypto/submit', auth, async (req, res) => {
  try {
    const { txHash, network, amount, artworkId } = req.body;
    if (!txHash || !network || !amount) return res.status(400).json({ message: 'All fields required' });
    res.json({
      success: true,
      message: 'Transaction submitted for verification. Usually takes 10-30 minutes.',
      txHash, network, amount, status: 'pending',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;