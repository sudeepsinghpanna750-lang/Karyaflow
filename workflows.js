const express = require('express');
const { body, validationResult } = require('express-validator');
const models = require('../models');
const { requireAuth } = require('../middleware/auth');
const { csrfProtect } = require('../middleware/csrf');
const { runWorkflow } = require('../ai');

const router = express.Router();

router.use(requireAuth);
router.use(csrfProtect);

router.get('/', (req, res) => {
  const items = models.listWorkflows(req.user.id, { limit: 100, offset: 0 });
  res.json({ workflows: items, access: models.getAccess(req.user) });
});

router.post(
  '/',
  [body('name').isLength({ min: 1, max: 120 }), body('config').optional().isObject()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input.' });

    const access = models.getAccess(req.user);
    if (!access.canCreate) {
      return res.status(402).json({
        error: 'You have reached your free workflow limit. Upgrade your plan to create more.',
        access,
      });
    }

    const name = String(req.body.name).trim();
    const description = req.body.description ? String(req.body.description).slice(0, 2000) : '';
    const config = req.body.config || {};
    const id = models.createWorkflow(req.user.id, name, description, config);
    res.json({ ok: true, id, access: models.getAccess(req.user) });
  }
);

router.get('/:id', (req, res) => {
  const wf = models.getWorkflow(req.user.id, parseInt(req.params.id, 10));
  if (!wf) return res.status(404).json({ error: 'Workflow not found.' });
  res.json({ workflow: wf });
});

router.put(
  '/:id',
  [body('name').optional().isLength({ min: 1, max: 120 }), body('config').optional().isObject()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input.' });
    const update = {};
    if (req.body.name !== undefined) update.name = String(req.body.name).trim();
    if (req.body.description !== undefined) update.description = String(req.body.description).slice(0, 2000);
    if (req.body.config !== undefined) update.config = req.body.config;
    const wf = models.updateWorkflow(req.user.id, parseInt(req.params.id, 10), update);
    if (!wf) return res.status(404).json({ error: 'Workflow not found.' });
    res.json({ ok: true, workflow: wf });
  }
);

router.delete('/:id', (req, res) => {
  const ok = models.deleteWorkflow(req.user.id, parseInt(req.params.id, 10));
  if (!ok) return res.status(404).json({ error: 'Workflow not found.' });
  res.json({ ok: true, access: models.getAccess(req.user) });
});

router.post('/:id/run', async (req, res) => {
  const wf = models.getWorkflow(req.user.id, parseInt(req.params.id, 10));
  if (!wf) return res.status(404).json({ error: 'Workflow not found.' });
  try {
    const result = await runWorkflow(wf, req.user);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
