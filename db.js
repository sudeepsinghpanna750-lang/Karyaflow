const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('./config');

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });

const db = new Database(config.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  ip TEXT,
  verified INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  plan TEXT DEFAULT 'free',
  plan_expires_at INTEGER DEFAULT 0,
  workflow_credits INTEGER DEFAULT 5,
  verify_token TEXT,
  verify_token_expires INTEGER DEFAULT 0,
  reset_token TEXT,
  reset_token_expires INTEGER DEFAULT 0,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS ip_signups (
  ip TEXT PRIMARY KEY,
  user_id INTEGER,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  config TEXT DEFAULT '{}',
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  plan TEXT,
  gateway TEXT,
  amount INTEGER,
  currency TEXT,
  status TEXT,
  gateway_id TEXT,
  created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
`);

module.exports = db;
