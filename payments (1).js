const express = require('express');
const models = require('../models');
const { requireAuth } = require('../middleware/auth');
const { csrfProtect } = require('../middleware/csrf');
const payments = require('../payments');
const { getPlan } = require('../plans');
const config = require('../config');

const router = express.Router();
router.use(requireAuth);
router.use(csrfProtect);

router.get('/status', (req, res) => {
  res.json({
    mode: config.paymentMode,
    stripe: !!config.stripeSecretKey,
    razorpay: !!(config.razorpayKeyId && config.razorpayKeySecret),
    razorpayKeyId: config.razorpayKeyId || null,
  });
});

router.post('/create-checkout', async (req, res) => {
  const { planId, gateway } = req.body || {};
  const plan = getPlan(planId);
  if (!plan) return res.status(400).json({ error: 'Invalid plan' });
  if (!['demo', 'stripe', 'razorpay'].includes(gateway)) return res.status(400).json({ error: 'Invalid gateway' });

  try {
    if (gateway === 'demo') {
      models.grantPlan(req.user.id, planId);
      models.recordPayment({
        userId: req.user.id,
        plan: planId,
        gateway: 'demo',
        amount: plan.priceUsd * 100,
        currency: 'usd',
        status: 'paid',
        gatewayId: 'demo',
      });
      return res.json({ ok: true, demo: true, access: models.getAccess(req.user) });
    }

    const result = await payments.createCheckout({ planId, gateway, user: req.user });
    const currency = gateway === 'razorpay' ? 'inr' : 'usd';
    const amount = gateway === 'razorpay' ? plan.priceInr * 100 : plan.priceUsd * 100;
    const pid = models.recordPayment({
      userId: req.user.id,
      plan: planId,
      gateway,
      amount,
      currency,
      status: 'pending',
      gatewayId: result.sessionId || (result.order && result.order.id) || null,
    });
    return res.json({ ok: true, ...result, paymentId: pid });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

router.post('/razorpay-verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!payments.verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }
  try {
    const rzp = payments.getRazorpay();
    if (!rzp) return res.status(400).json({ error: 'Razorpay is not configured' });
    const order = await rzp.orders.fetch(razorpay_order_id);
    const planId = order.notes && order.notes.planId;
    const userId = order.notes && order.notes.userId;
    if (String(userId) !== String(req.user.id)) return res.status(403).json({ error: 'Order does not belong to this user' });
    if (!getPlan(planId)) return res.status(400).json({ error: 'Invalid plan' });
    models.grantPlan(req.user.id, planId);
    models.recordPayment({
      userId: req.user.id,
      plan: planId,
      gateway: 'razorpay',
      amount: order.amount,
      currency: order.currency,
      status: 'paid',
      gatewayId: razorpay_payment_id,
    });
    return res.json({ ok: true, access: models.getAccess(req.user) });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

// Stripe webhook (mounted with raw body in server.js)
async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const event = payments.verifyStripeWebhook(req.body, sig); // req.body is a Buffer
  if (!event) return res.status(400).send('Invalid signature');
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata && session.metadata.userId;
    const planId = session.metadata && session.metadata.planId;
    if (userId && getPlan(planId)) {
      models.grantPlan(parseInt(userId, 10), planId);
      models.recordPayment({
        userId: parseInt(userId, 10),
        plan: planId,
        gateway: 'stripe',
        amount: session.amount_total,
        currency: session.currency,
        status: 'paid',
        gatewayId: session.id,
      });
    }
  }
  return res.json({ received: true });
}

module.exports = router;
module.exports.stripeWebhook = stripeWebhook;
