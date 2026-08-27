import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/recover_ai.db');

let _db = null;

export function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

export function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      lifetime_value REAL DEFAULT 0,
      successful_payments INTEGER DEFAULT 0,
      failed_payments INTEGER DEFAULT 0,
      last_payment_at TEXT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      customer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      status TEXT NOT NULL,
      failure_reason TEXT,
      payment_method TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

    CREATE TABLE IF NOT EXISTS recovery_cases (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      recovery_score REAL,
      risk_score REAL,
      root_cause TEXT,
      recommended_action TEXT,
      confidence REAL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (payment_id) REFERENCES payments(id)
    );

    CREATE INDEX IF NOT EXISTS idx_cases_payment ON recovery_cases(payment_id);
    CREATE INDEX IF NOT EXISTS idx_cases_status ON recovery_cases(status);

    CREATE TABLE IF NOT EXISTS agent_actions (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      agent TEXT NOT NULL,
      action TEXT,
      reason TEXT,
      confidence REAL,
      input_data TEXT,
      policy_result TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (case_id) REFERENCES recovery_cases(id)
    );

    CREATE INDEX IF NOT EXISTS idx_actions_case ON agent_actions(case_id);

    CREATE TABLE IF NOT EXISTS recovery_outcomes (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      action TEXT,
      recovered_amount REAL DEFAULT 0,
      outcome TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (case_id) REFERENCES recovery_cases(id)
    );

    CREATE TABLE IF NOT EXISTS merchant_policies (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      max_auto_retry_amount REAL DEFAULT 5000,
      max_retry_count INTEGER DEFAULT 2,
      require_approval_above REAL DEFAULT 10000,
      allowed_actions TEXT DEFAULT '["RETRY_PAYMENT","SEND_REMINDER","DO_NOTHING"]',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO merchant_policies (id, max_auto_retry_amount, max_retry_count, require_approval_above, allowed_actions)
    VALUES (1, 5000, 2, 10000, '["RETRY_PAYMENT","SEND_REMINDER","DO_NOTHING","OFFER_ALTERNATIVE_METHOD"]');

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      google_id TEXT UNIQUE,
      avatar_url TEXT,
      auth_provider TEXT DEFAULT 'local',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migration: Ensure new OAuth columns exist for existing databases
  const userColumns = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userColumns.includes('google_id')) {
    db.exec("ALTER TABLE users ADD COLUMN google_id TEXT");
  }
  if (!userColumns.includes('avatar_url')) {
    db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT");
  }
  if (!userColumns.includes('auth_provider')) {
    db.exec("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'");
  }
  // Ensure google_id uniqueness via index (ALTER TABLE ADD COLUMN cannot include constraints)
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL");

  // Migration: Ensure user_id column exists on customers and payments
  const customerColumns = db.prepare("PRAGMA table_info(customers)").all().map(c => c.name);
  if (!customerColumns.includes('user_id')) {
    db.exec("ALTER TABLE customers ADD COLUMN user_id TEXT");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id)");

  const paymentColumns = db.prepare("PRAGMA table_info(payments)").all().map(c => c.name);
  if (!paymentColumns.includes('user_id')) {
    db.exec("ALTER TABLE payments ADD COLUMN user_id TEXT");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)");

  // Backfill unassigned existing seed dataset to default admin user ('usr_default_admin')
  db.exec("UPDATE customers SET user_id = 'usr_default_admin' WHERE user_id IS NULL");
  db.exec("UPDATE payments SET user_id = 'usr_default_admin' WHERE user_id IS NULL");

  // Seed default user if none exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('password123', salt);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, auth_provider)
      VALUES (?, ?, ?, ?, 'local')
    `).run('usr_default_admin', 'RecoverAI Merchant', 'admin@recover.ai', hash);
    console.log('[DB] Seeded default user admin@recover.ai / password123');
  }

  // Ensure Demo Account exists & has mock data seeded
  const demoPayments = db.prepare("SELECT COUNT(*) as count FROM payments WHERE user_id = 'usr_demo_account'").get().count;
  if (demoPayments === 0) {
    import('./seedDemo.js').then(m => m.seedDemoAccount());
  }

  console.log('[DB] Schema initialized at', DB_PATH);
}
