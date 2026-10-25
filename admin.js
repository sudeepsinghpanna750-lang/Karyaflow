const express = require('express');
const models = require('../models');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { csrfProtect } = require('../middleware/csrf');
const { getPlan } = require('../plans');
const db = require('../db');

const router = express.Router();
router.use(requireAuth);
router.use(requireAdmin);
router.use(csrfProtect);

router.get('/stats', (req, res) => res.json(models.adminStats()));
router.get('/users', (req, res) => res.json({ users: models.listUsers() }));
router.get('/payments', (req, res) => res.json({ payments: models.listPayments() }));

router.post('/users/:id/plan', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { planId } = req.body || {};
  if (planId === 'free') {
    db.prepare("UPDATE users SET plan='free', plan_expires_at=0 WHERE id=?").run(id);
  } else if (getPlan(planId)) {
    models.grantPlan(id, planId);
  } else {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  res.json({ ok: true });
});

router.delete('/users/:id', (req, res) => {
  const ok = models.deleteUser(parseInt(req.params.id, 10));
  res.json({ ok });
});

module.exports = router;
