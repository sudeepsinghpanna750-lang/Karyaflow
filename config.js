require('dotenv').config();
const path = require('path');
const crypto = require('crypto');

function bool(v, d = false) {
  if (v === undefined || v === null || v === '') return d;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function randomSecret() {
  return crypto.randomBytes(48).toString('hex');
}

const hasPaymentKeys = !!(process.env.STRIPE_SECRET_KEY || process.env.RAZORPAY_KEY_ID);

const port = parseInt(process.env.PORT || '3000', 10);
const appUrl = process.env.APP_URL || `http://localhost:${port}`;

module.exports = {
  port,
  appUrl,
  secureCookies: bool(process.env.SECURE_COOKIES, appUrl.startsWith('https') || process.env.NODE_ENV === 'production'),
  sessionSecret: process.env.SESSION_SECRET || randomSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbFile: process.env.DB_FILE || path.join(__dirname, '..', 'data', 'karyaflow.db'),
  trustProxy: bool(process.env.TRUST_PROXY, true),

  // Email (Gmail SMTP)
  emailUser: process.env.EMAIL_USER || '',
  emailAppPassword: process.env.EMAIL_APP_PASSWORD || '',
  emailFromName: process.env.EMAIL_FROM_NAME || 'KaryaFlow',

  // Payments
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  // 'live' uses real gateways when keys present; 'demo' simulates success for testing.
  paymentMode: (process.env.PAYMENT_MODE || (hasPaymentKeys ? 'live' : 'demo')),

  // Pluggable AI
  aiProvider: process.env.AI_PROVIDER || 'none', // none | openai | openai-compatible
  aiApiKey: process.env.AI_API_KEY || '',
  aiBaseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
  aiModel: process.env.AI_MODEL || 'gpt-4o-mini',

  // Admin / owner seed
  adminEmail: (process.env.ADMIN_EMAIL || 'rajashb398@gmail.com').toLowerCase().trim(),
  adminPassword: process.env.ADMIN_PASSWORD || '@#398421&#Mydear£',

  hasPaymentKeys,
};
