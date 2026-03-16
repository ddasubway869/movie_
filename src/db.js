import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = process.env.DB_PATH
  ? path.dirname(process.env.DB_PATH)
  : path.join(__dirname, "../data");
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, "slate.db");

let _db = null;

function getDb() {
  if (_db) return _db;
  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  initSchema(db);
  _db = db;
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      torbox_api_key TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tmdb_id INTEGER NOT NULL,
      media_type TEXT NOT NULL CHECK(media_type IN ('movie','tv')),
      title TEXT NOT NULL,
      poster_path TEXT,
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, tmdb_id, media_type)
    );

    CREATE TABLE IF NOT EXISTS watch_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tmdb_id INTEGER NOT NULL,
      media_type TEXT NOT NULL CHECK(media_type IN ('movie','tv')),
      title TEXT NOT NULL,
      poster_path TEXT,
      watched_at TEXT NOT NULL DEFAULT (datetime('now')),
      progress REAL NOT NULL DEFAULT 0,
      UNIQUE(user_id, tmdb_id, media_type)
    );

    CREATE TABLE IF NOT EXISTS watch_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tmdb_id INTEGER NOT NULL,
      media_type TEXT NOT NULL,
      watched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migrations — safe to run every boot
  try { db.exec("ALTER TABLE watch_history ADD COLUMN season INTEGER"); } catch {}
  try { db.exec("ALTER TABLE watch_history ADD COLUMN episode INTEGER"); } catch {}
  try { db.exec("ALTER TABLE watch_history ADD COLUMN episode_name TEXT"); } catch {}
  try { db.exec("ALTER TABLE watch_history ADD COLUMN watch_count INTEGER NOT NULL DEFAULT 1"); } catch {}
}

export default getDb;
