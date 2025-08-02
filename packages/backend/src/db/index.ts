// packages/backend/src/db/index.ts
// Using basic SQLite3 functionality without drizzle ORM to avoid dependency issues
import sqlite3 from 'sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Initialize SQLite database
const sqlite = new sqlite3.Database(join(__dirname, '../../../db.sqlite'));

// Export the database connection
export const db = sqlite;

// Initialize tables if they don't exist
export async function ensureTables() {
  const createServersTable = `
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      command TEXT,
      args TEXT,
      url TEXT,
      enabled INTEGER DEFAULT 1,
      namespace TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createMiddlewaresTable = `
    CREATE TABLE IF NOT EXISTS middlewares (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      code TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 100,
      config TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createSessionsTable = `
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      namespace TEXT NOT NULL,
      system_prompt TEXT NOT NULL,
      enabled_tools TEXT,
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 1000,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_calls TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
    )
  `;

  return new Promise((resolve, reject) => {
    sqlite.serialize(() => {
      sqlite.run(createServersTable, (err) => {
        if (err) return reject(err);
      });
      
      sqlite.run(createMiddlewaresTable, (err) => {
        if (err) return reject(err);
      });
      
      sqlite.run(createSessionsTable, (err) => {
        if (err) return reject(err);
      });
      
      sqlite.run(createMessagesTable, (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  });
}

// Export a simple query helper function
export function query(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    sqlite.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Export a simple execute function for non-query SQL statements
export function execute(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    sqlite.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve();
    });
  });
}
