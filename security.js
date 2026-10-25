const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('./config');

const SALT_ROUNDS = 12;

function hashPassword(pw) {
  return bcrypt.hash(pw, SALT_ROUNDS);
}

function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function signSession(user) {
  return jwt.sign(
    { uid: user.id, admin: !!user.is_admin },
    config.sessionSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function verifySession(token) {
  try {
    return jwt.verify(token, config.sessionSecret);
  } catch (e) {
    return null;
  }
}

// Best-effort client IP extraction (works behind proxies / the preview host).
function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const first = String(xff).split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || (req.socket && req.socket.remoteAddress) || '0.0.0.0';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

function isValidPassword(pw) {
  return typeof pw === 'string' && pw.length >= 8 && pw.length <= 200;
}

module.exports = {
  hashPassword,
  verifyPassword,
  randomToken,
  signSession,
  verifySession,
  getClientIp,
  isValidEmail,
  isValidPassword,
};
