const db = require('./db');
const security = require('./security');
const { getPlan } = require('./plans');

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    plan: u.plan,
    verified: !!u.verified,
    is_admin: !!u.is_admin,
    workflow_credits: u.workflow_credits,
    plan_expires_at: u.plan_expires_at,
  };
}

function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase().trim());
}
function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}
function ipHasSignup(ip) {
  return !!db.prepare('SELECT 1 FROM ip_signups WHERE ip = ?').get(ip);
}
function recordIpSignup(ip, userId) {
  db.prepare('INSERT OR IGNORE INTO ip_signups (ip, user_id, created_at) VALUES (?,?,?)').run(ip, userId, Date.now());
}

function createUser({ email, passwordHash, ip, isAdmin = false }) {
  const now = Date.now();
  const info = db
    .prepare(
      `INSERT INTO users (email, password_hash, ip, is_admin, plan, workflow_credits, verified, created_at)
       VALUES (?,?,?,?, 'free', 5, ?, ?)`
    )
    .run(String(email).toLowerCase().trim(), passwordHash, ip, isAdmin ? 1 : 0, isAdmin ? 1 : 0, now);
  return getUserById(info.lastInsertRowid);
}

function setVerifyToken(userId, token, expires) {
  db.prepare('UPDATE users SET verify_token = ?, verify_token_expires = ? WHERE id = ?').run(token, expires, userId);
}
function verifyUserByToken(token) {
  const user = db.prepare('SELECT * FROM users WHERE verify_token = ? AND verify_token_expires > ?').get(token, Date.now());
  if (!user) return null;
  db.prepare("UPDATE users SET verified = 1, verify_token = NULL, verify_token_expires = 0 WHERE id = ?").run(user.id);
  return user;
}

function countUserWorkflows(userId) {
  const row = db.prepare('SELECT COUNT(*) AS c FROM workflows WHERE user_id = ?').get(userId);
  return row ? row.c : 0;
}

function getAccess(user) {
  const now = Date.now();
  const isUnlimited =
    user.is_admin === 1 ||
    ((user.plan === 'standard' || user.plan === 'premium') && user.plan_expires_at > now);
  const used = countUserWorkflows(user.id);
  const limit = user.workflow_credits;
  return {
    unlimited: isUnlimited,
    used,
    limit,
    canCreate: isUnlimited || used < limit,
    plan: user.plan,
    plan_expires_at: user.plan_expires_at,
  };
}

function grantPlan(userId, planId) {
  const plan = getPlan(planId);
  if (!plan) return false;
  const user = getUserById(userId);
  if (!user) return false;
  const now = Date.now();
  if (plan.type === 'credits') {
    db.prepare('UPDATE users SET workflow_credits = workflow_credits + ? WHERE id = ?').run(plan.credits, userId);
  } else {
    db.prepare('UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?').run(
      planId,
      now + plan.durationDays * 86400000,
      userId
    );
  }
  return true;
}

function createWorkflow(userId, name, description, config) {
  const now = Date.now();
  const info = db
    .prepare('INSERT INTO workflows (user_id, name, description, config, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    .run(userId, name, description || '', JSON.stringify(config || {}), now, now);
  return info.lastInsertRowid;
}
function getWorkflow(userId, id) {
  const wf = db.prepare('SELECT * FROM workflows WHERE id = ? AND user_id = ?').get(id, userId);
  if (!wf) return null;
  try { wf.config = JSON.parse(wf.config || '{}'); } catch (e) { wf.config = {}; }
  return wf;
}
function listWorkflows(userId, { limit = 50, offset = 0 } = {}) {
  const rows = db
    .prepare('SELECT id, name, description, created_at, updated_at FROM workflows WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(userId, limit, offset);
  return rows;
}
function updateWorkflow(userId, id, { name, description, config }) {
  const wf = getWorkflow(userId, id);
  if (!wf) return null;
  db.prepare('UPDATE workflows SET name = ?, description = ?, config = ?, updated_at = ? WHERE id = ? AND user_id = ?')
    .run(name, description || '', JSON.stringify(config || {}), Date.now(), id, userId);
  return getWorkflow(userId, id);
}
function deleteWorkflow(userId, id) {
  return db.prepare('DELETE FROM workflows WHERE id = ? AND user_id = ?').run(id, userId).changes > 0;
}

function recordPayment({ userId, plan, gateway, amount, currency, status, gatewayId }) {
  const info = db
    .prepare(
      'INSERT INTO payments (user_id, plan, gateway, amount, currency, status, gateway_id, created_at) VALUES (?,?,?,?,?,?,?,?)'
    )
    .run(userId, plan, gateway, amount, currency, status, gatewayId, Date.now());
  return info.lastInsertRowid;
}

function listUsers() {
  return db
    .prepare('SELECT id, email, plan, verified, is_admin, workflow_credits, plan_expires_at, created_at FROM users ORDER BY id DESC')
    .all();
}
function deleteUser(id) {
  return db.prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0;
}
function adminStats() {
  const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const verified = db.prepare('SELECT COUNT(*) AS c FROM users WHERE verified = 1').get().c;
  const workflows = db.prepare('SELECT COUNT(*) AS c FROM workflows').get().c;
  const payments = db.prepare("SELECT COUNT(*) AS c FROM payments WHERE status = 'paid'").get().c;
  const revenueUsd = db.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE status = 'paid' AND currency = 'usd'").get().s;
  const revenueInr = db.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE status = 'paid' AND currency = 'inr'").get().s;
  return { users, verified, workflows, payments, revenueUsd: revenueUsd / 100, revenueInr: revenueInr / 100 };
}
function listPayments() {
  return db.prepare('SELECT id, user_id, plan, gateway, amount, currency, status, gateway_id, created_at FROM payments ORDER BY id DESC LIMIT 200').all();
}

module.exports = {
  publicUser,
  getUserByEmail,
  getUserById,
  ipHasSignup,
  recordIpSignup,
  createUser,
  setVerifyToken,
  verifyUserByToken,
  countUserWorkflows,
  getAccess,
  grantPlan,
  createWorkflow,
  getWorkflow,
  listWorkflows,
  updateWorkflow,
  deleteWorkflow,
  recordPayment,
  listUsers,
  deleteUser,
  adminStats,
  listPayments,
};
