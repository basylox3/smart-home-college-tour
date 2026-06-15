import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dataDirectory = path.join(process.cwd(), "data");
const defaultDatabasePath = process.env.VERCEL ? path.join("/tmp", "tour.sqlite") : path.join(dataDirectory, "tour.sqlite");
const databasePath = process.env.SQLITE_PATH || defaultDatabasePath;

type DatabaseGlobal = typeof globalThis & {
  __tourDatabase?: DatabaseSync;
};

const globalForDatabase = globalThis as DatabaseGlobal;

const createDatabase = () => {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);

  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      tags TEXT NOT NULL,
      accent TEXT NOT NULL,
      visual TEXT NOT NULL DEFAULT '',
      panorama_image TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return database;
};

export const getDatabase = () => {
  if (!globalForDatabase.__tourDatabase) {
    globalForDatabase.__tourDatabase = createDatabase();
  }

  return globalForDatabase.__tourDatabase;
};
