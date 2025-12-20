import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
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
    console.log(`Database directory created successfully`);
  } else {
    console.log(`Database directory exists: ${dbDir}`);
  }

  // Test write permissions
  const testFile = path.join(dbDir, '.write-test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log(`Database directory is writable`);
} catch (error) {
  console.error(`Failed to prepare database directory: ${dbDir}`);
  console.error(`Error: ${error}`);
  const uid = process.getuid ? process.getuid() : 'unknown';
  const gid = process.getgid ? process.getgid() : 'unknown';
  console.error(`Current user: UID=${uid}, GID=${gid}`);
  process.exit(1);
}

console.log(`Opening database at: ${dbPath}`);
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

async function runMigrations() {
  console.log('Running migrations...');

  try {
    // Use different paths for development vs production
    const migrationsFolder = process.env.NODE_ENV === 'production'
      ? './migrations'
      : './src/db/migrations';

    await migrate(db, { migrationsFolder });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  sqlite.close();
}

runMigrations();
