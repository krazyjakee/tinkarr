import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config();

const dbPath = process.env.DATABASE_URL || './data/tinkarr.db';
const dbDir = path.dirname(dbPath);

// Create data directory if it doesn't exist
try {
  if (!fs.existsSync(dbDir)) {
    console.log(`Creating database directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch (error) {
  console.error(`Failed to create database directory: ${dbDir}`, error);
  throw error;
}

// Initialize SQLite database
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

export { schema };
