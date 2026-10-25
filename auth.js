const security = require('../security');
const models = require('../models');

function getUserFromRequest(req) {
  const token = req.cookies && req.cookies['kf_session'];
  if (!token) return null;
  const payload = security.verifySession(token);
  if (!payload) return null;
  const user = models.getUserById(payload.uid);
  if (!user) return null;
  return user;
}

function requireAuth(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) return res.status(403).json({ error: 'Forbidden' });
  next();
}

module.exports = { getUserFromRequest, requireAuth, requireAdmin };
