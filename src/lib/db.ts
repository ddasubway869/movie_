import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

const DB_DIR = "/tmp/slate-db";
const DB_PATH = path.join(DB_DIR, "slate.db");

// Cache connection across hot-reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var __slateDb: DatabaseSync | undefined;
}

function getDb(): DatabaseSync {
  if (global.__slateDb) return global.__slateDb;
  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  initSchema(db);
  global.__slateDb = db;
  return db;
}

function initSchema(db: DatabaseSync) {
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
  `);
}

export default getDb;
