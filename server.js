const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');
const config = require('./src/config');

const app = express();
app.set('trust proxy', config.trustProxy);

// ---- Security headers ----
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://checkout.razorpay.com', 'https://js.stripe.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        frameSrc: ["'self'", 'https://js.stripe.com'],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hsts: config.secureCookies ? { maxAge: 31536000, includeSubDomains: true } : false,
  })
);

// ---- Static frontend ----
const publicDir = path.join(__dirname, 'public');
app.use(
  express.static(publicDir, {
    extensions: ['html'],
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  })
);

// ---- Stripe webhook MUST receive the RAW body (mount BEFORE json parsing) ----
const paymentRoutes = require('./src/routes/payments');
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), paymentRoutes.stripeWebhook);

// ---- Body parsing (everything except the raw webhook above) ----
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---- API routes ----
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/workflows', require('./src/routes/workflows'));
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', require('./src/routes/admin'));

// ---- Seed admin / owner account ----
(async () => {
  try {
    const models = require('./src/models');
    const security = require('./src/security');
    const db = require('./src/db');
    const existing = models.getUserByEmail(config.adminEmail);
    if (!existing) {
      const hash = await security.hashPassword(config.adminPassword);
      const user = models.createUser({ email: config.adminEmail, passwordHash: hash, ip: null, isAdmin: true });
      db.prepare("UPDATE users SET plan='premium', plan_expires_at=?, workflow_credits=1000000 WHERE id=?").run(
        Date.now() + 1000 * 365 * 24 * 3600 * 1000,
        user.id
      );
      console.log('Seeded owner/admin account:', config.adminEmail);
    }
  } catch (e) {
    console.error('Admin seed failed:', e.message);
  }
})();

app.listen(config.port, () => {
  console.log(`\n  KaryaFlow running → ${config.appUrl}`);
  console.log(`  Payment mode: ${config.paymentMode}`);
  console.log(`  Email (Gmail SMTP): ${config.emailUser ? 'configured' : 'DEV fallback (link shown on screen)'}`);
  console.log(`  Stripe: ${config.stripeSecretKey ? 'configured' : 'not set'}`);
  console.log(`  Razorpay: ${config.razorpayKeyId ? 'configured' : 'not set'}\n`);
});
