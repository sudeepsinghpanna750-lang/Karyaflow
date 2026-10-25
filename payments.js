const crypto = require('crypto');
const config = require('./config');
const { getPlan } = require('./plans');

function getStripe() {
  if (!config.stripeSecretKey) return null;
  const Stripe = require('stripe');
  return Stripe(config.stripeSecretKey);
}
function getRazorpay() {
  if (!config.razorpayKeyId || !config.razorpayKeySecret) return null;
  const Razorpay = require('razorpay');
  return new Razorpay({ key_id: config.razorpayKeyId, key_secret: config.razorpayKeySecret });
}

// Returns what the client needs to complete checkout.
async function createCheckout({ planId, gateway, user }) {
  const plan = getPlan(planId);
  if (!plan) throw new Error('Invalid plan');

  if (gateway === 'demo') {
    return { mode: 'demo', planId };
  }

  if (gateway === 'stripe') {
    const stripe = getStripe();
    if (!stripe) throw new Error('Stripe is not configured');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${config.appUrl}/dashboard.html?payment=success`,
      cancel_url: `${config.appUrl}/pricing.html?payment=cancel`,
      client_reference_id: String(user.id),
      customer_email: user.email,
      metadata: { planId, userId: String(user.id) },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `KaryaFlow ${plan.name} — ${plan.tagline}` },
            unit_amount: plan.priceUsd * 100,
          },
          quantity: 1,
        },
      ],
    });
    return { mode: 'stripe', url: session.url, sessionId: session.id };
  }

  if (gateway === 'razorpay') {
    const rzp = getRazorpay();
    if (!rzp) throw new Error('Razorpay is not configured');
    const amount = plan.priceInr * 100; // paise
    const order = await rzp.orders.create({
      amount,
      currency: 'INR',
      receipt: `kf_${user.id}_${Date.now()}`,
      notes: { planId, userId: String(user.id) },
    });
    return { mode: 'razorpay', order, keyId: config.razorpayKeyId };
  }

  throw new Error('Unknown gateway');
}

function verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!config.razorpayKeySecret) return false;
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto.createHmac('sha256', config.razorpayKeySecret).update(body).digest('hex');
  return expected === razorpay_signature;
}

function verifyStripeWebhook(rawBody, signature) {
  const stripe = getStripe();
  if (!stripe || !config.stripeWebhookSecret) return null;
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, config.stripeWebhookSecret);
  } catch (e) {
    console.error('[stripe] webhook verify failed:', e.message);
    return null;
  }
}

module.exports = { getStripe, getRazorpay, createCheckout, verifyRazorpaySignature, verifyStripeWebhook };
