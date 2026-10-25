const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');
const config = require('./config');
const paymentRoutes = require('./payments (1)');
const authRoutes = require('./auth-routes');
const workflowRoutes = require('./workflows');
const adminRoutes = require('./admin');

const app = express();
app.set('trust proxy', config.trustProxy);
app.use(helmet({ contentSecurityPolicy: false, hsts: config.secureCookies ? { maxAge: 31536000, includeSubDomains: true } : false }));
app.use(cookieParser());
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'karyaflow' }));
app.use(express.json({ limit: '1mb' }));
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), paymentRoutes.stripeWebhook);
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use(express.static(__dirname, { extensions: ['html'], index: 'index.html', setHeaders: (res, filePath) => { if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); } }));

(async () => {
  try {
    const existing = models.getUserByEmail(config.adminEmail);
    if (!existing) {
      const hash = await security.hashPassword(config.adminPassword);
      const user = models.createUser({ email: config.adminEmail, passwordHash: hash, ip: null, isAdmin: true });
      db.prepare("UPDATE users SET plan='premium', plan_expires_at=?, workflow_credits=1000000 WHERE id=?").run(Date.now() + 365 * 86400000, user.id);
    }
  } catch (error) { console.error('Admin seed failed:', error.message); }
})();

const models = require('./models');
const security = require('./security');
const db = require('./db');
app.listen(config.port, () => console.log(`KaryaFlow running on ${config.appUrl}`));
