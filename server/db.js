import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use Railway's persistent volume if available, otherwise local server/data
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH
  || process.env.DATA_DIR
  || path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

// Ensure data directory exists
import fs from 'fs';
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Create the generic entities table (schemaless JSON document store)
db.exec(`
  CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    created_date TEXT NOT NULL DEFAULT (datetime('now')),
    updated_date TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT DEFAULT 'system'
  );
  CREATE INDEX IF NOT EXISTS idx_entity_type ON entities(entity_type);
  CREATE INDEX IF NOT EXISTS idx_created_date ON entities(entity_type, created_date);
  CREATE INDEX IF NOT EXISTS idx_updated_date ON entities(entity_type, updated_date);
`);

// Create users table for auth
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    role TEXT DEFAULT 'user',
    data TEXT NOT NULL DEFAULT '{}',
    created_date TEXT NOT NULL DEFAULT (datetime('now')),
    updated_date TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed default admin if no users exist
import bcrypt from 'bcryptjs';
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  const adminId = crypto.randomUUID().replace(/-/g, '');
  db.prepare(`
    INSERT INTO users (id, email, password, full_name, role, data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    adminId,
    'admin@prodhan.com',
    hashedPassword,
    'Admin User',
    'admin',
    JSON.stringify({
      role: 'admin',
      job_role: 'super_admin',
      department: 'it',
      designation: 'System Administrator',
      phone: '+880000000000',
      is_active: true,
      display_name: 'Admin User',
      employee_id: 'EMP-001'
    })
  );
  console.log('✅ BeeERP default admin seeded: admin@prodhan.com / admin123');
}

export default db;
