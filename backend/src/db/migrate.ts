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

function validateMigrationFiles(migrationsFolder: string): void {
  const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
  const absoluteMigrationsPath = path.resolve(migrationsFolder);

  console.log(`Validating migration files in: ${migrationsFolder}`);
  console.log(`Absolute path: ${absoluteMigrationsPath}`);
  console.log(`Checking journal at: ${journalPath}`);
  console.log(`Current working directory: ${process.cwd()}`);

  // Check if migrations folder exists
  if (!fs.existsSync(migrationsFolder)) {
    console.error(`FATAL: Migrations folder not found: ${migrationsFolder}`);
    console.error(`This likely means migration files were not included in the build.`);
    process.exit(1);
  }

  // List all files in migrations folder for debugging
  try {
    const files = fs.readdirSync(migrationsFolder);
    console.log(`Files in ${migrationsFolder}:`, files);
  } catch (error) {
    console.error(`Error reading migrations folder:`, error);
  }

  // Check if journal file exists
  if (!fs.existsSync(journalPath)) {
    console.error(`FATAL: Migration journal not found: ${journalPath}`);
    console.error(`The meta/_journal.json file is required to track migrations.`);
    process.exit(1);
  }

  // Read and parse journal
  let journal;
  try {
    const journalContent = fs.readFileSync(journalPath, 'utf-8');
    journal = JSON.parse(journalContent);
  } catch (error) {
    console.error(`FATAL: Failed to read migration journal: ${error}`);
    process.exit(1);
  }

  // Validate each migration file exists
  const missingFiles: string[] = [];
  const entries = journal.entries || [];

  console.log(`Found ${entries.length} migration(s) in journal`);

  for (const entry of entries) {
    const migrationFile = `${entry.tag}.sql`;
    const migrationPath = path.join(migrationsFolder, migrationFile);
    const absoluteMigrationPath = path.resolve(migrationPath);

    if (!fs.existsSync(migrationPath)) {
      missingFiles.push(migrationFile);
      console.error(`  ✗ MISSING: ${migrationFile}`);
      console.error(`    Expected at: ${absoluteMigrationPath}`);
    } else {
      const stats = fs.statSync(migrationPath);
      console.log(`  ✓ Found: ${migrationFile}`);
      console.log(`    Path: ${absoluteMigrationPath}`);
      console.log(`    Size: ${stats.size} bytes`);
      console.log(`    Permissions: ${stats.mode.toString(8)}`);
      console.log(`    Type: ${stats.isFile() ? 'file' : stats.isSymbolicLink() ? 'symlink' : 'other'}`);
    }
  }

  // Fail if any files are missing
  if (missingFiles.length > 0) {
    console.error(`\nFATAL: ${missingFiles.length} migration file(s) missing from ${migrationsFolder}:`);
    missingFiles.forEach(file => console.error(`  - ${file}`));
    console.error(`\nThis is a critical error. Migration files must be:`);
    console.error(`  1. Committed to git (check .gitignore)`);
    console.error(`  2. Included in Docker build (check Dockerfile COPY commands)`);
    console.error(`  3. Present in the migrations folder at runtime`);
    process.exit(1);
  }

  console.log(`✓ All ${entries.length} migration file(s) validated successfully\n`);
}

async function runMigrations() {
  console.log('Running migrations...');

  try {
    // Use different paths for development vs production
    const migrationsFolder = process.env.NODE_ENV === 'production'
      ? './migrations'
      : './src/db/migrations';

    // Validate all migration files exist before attempting to run
    validateMigrationFiles(migrationsFolder);

    await migrate(db, { migrationsFolder });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  sqlite.close();
}

runMigrations();
