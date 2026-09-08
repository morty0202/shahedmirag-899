/**
 * SQLite database layer using sql.js (pure JS, no native compilation needed).
 * Persists to disk via async file writes.
 */

import initSqlJs from "sql.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "meraj_data.db");

let _db = null;

export async function getDb() {
  if (_db) return _db;

  const SQL = await initSqlJs();
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    _db = new SQL.Database(buffer);
  } else {
    _db = new SQL.Database();
  }

  initSchema(_db);
  saveDb();
  return _db;
}

function initSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL DEFAULT 'student',
      username TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      father_name TEXT NOT NULL DEFAULT '—',
      birth_date_jy INTEGER DEFAULT 1388,
      birth_date_jm INTEGER DEFAULT 7,
      birth_date_jd INTEGER DEFAULT 12,
      national_id TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      email TEXT,
      avatar TEXT,
      grade TEXT NOT NULL DEFAULT '',
      class_name TEXT NOT NULL DEFAULT '',
      field TEXT NOT NULL DEFAULT '',
      academic_year TEXT NOT NULL DEFAULT '',
      student_number TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS class_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      grade TEXT NOT NULL,
      date_jy INTEGER NOT NULL,
      date_jm INTEGER NOT NULL,
      date_jd INTEGER NOT NULL,
      time TEXT NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 60,
      room_code TEXT NOT NULL,
      teacher_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      type TEXT NOT NULL,
      at INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reset_codes (
      user_id TEXT NOT NULL PRIMARY KEY,
      code TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      username TEXT NOT NULL PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS education_items (
      id TEXT PRIMARY KEY,
      grade_id TEXT NOT NULL,
      classroom_id TEXT NOT NULL,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'file',
      name TEXT NOT NULL,
      size_label TEXT NOT NULL DEFAULT '',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      mime TEXT NOT NULL DEFAULT '',
      data_url TEXT,
      uploader_id TEXT,
      uploader_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS honors (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      badge TEXT NOT NULL DEFAULT '',
      badge_color TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS field_trips (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date_text TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT '',
      type_color TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      author_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS gallery_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      img_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT NOT NULL DEFAULT 'announcement',
      title TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      link TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS schedule_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time_text TEXT NOT NULL,
      lesson TEXT NOT NULL,
      room TEXT NOT NULL,
      teacher TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'upcoming'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      theme TEXT NOT NULL DEFAULT 'dark',
      notify_booklets INTEGER NOT NULL DEFAULT 1,
      notify_trips INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      model TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      source TEXT,
      model TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // appearance preferences (guarded migration for existing DBs)
  try {
    db.run("ALTER TABLE user_settings ADD COLUMN accent TEXT NOT NULL DEFAULT 'aurora'");
  } catch {
    /* column already exists */
  }
  try {
    db.run("ALTER TABLE user_settings ADD COLUMN bg_style TEXT NOT NULL DEFAULT 'none'");
  } catch {
    /* column already exists */
  }
}

export function saveDb() {
  if (!_db) return;
  const data = _db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

export function closeDb() {
  if (_db) {
    saveDb();
    _db.close();
    _db = null;
  }
}

/**
 * Helper: run a query and return all rows as objects.
 */
export function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Helper: run a query and return the first row as an object.
 */
export function queryOne(db, sql, params = []) {
  const results = queryAll(db, sql, params);
  return results[0] || undefined;
}

/**
 * Helper: run an INSERT/UPDATE/DELETE and return changes count.
 */
export function runSql(db, sql, params = []) {
  db.run(sql, params);
  const changes = db.getRowsModified();
  saveDb(); // persist after writes
  return changes;
}
