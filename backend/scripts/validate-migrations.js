#!/usr/bin/env node
/**
 * Pre-build validation script for migration files
 * This script ensures all migration files referenced in the journal exist
 * before building/deploying to production.
 *
 * Usage: node scripts/validate-migrations.js
 * Exit codes: 0 = success, 1 = validation failed
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'db', 'migrations');
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, 'meta', '_journal.json');

console.log('=== Migration Files Validation ===\n');
console.log(`Migrations directory: ${MIGRATIONS_DIR}`);
console.log(`Journal file: ${JOURNAL_PATH}\n`);

// Check if migrations directory exists
if (!fs.existsSync(MIGRATIONS_DIR)) {
  console.error(`❌ FATAL: Migrations directory not found: ${MIGRATIONS_DIR}`);
  process.exit(1);
}

// Check if journal file exists
if (!fs.existsSync(JOURNAL_PATH)) {
  console.error(`❌ FATAL: Migration journal not found: ${JOURNAL_PATH}`);
  process.exit(1);
}

// Read and parse journal
let journal;
try {
  const journalContent = fs.readFileSync(JOURNAL_PATH, 'utf-8');
  journal = JSON.parse(journalContent);
} catch (error) {
  console.error(`❌ FATAL: Failed to read migration journal: ${error.message}`);
  process.exit(1);
}

// Validate each migration file exists
const entries = journal.entries || [];
const missingFiles = [];
const foundFiles = [];

console.log(`Found ${entries.length} migration(s) in journal:\n`);

for (const entry of entries) {
  const migrationFile = `${entry.tag}.sql`;
  const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);

  if (!fs.existsSync(migrationPath)) {
    missingFiles.push(migrationFile);
    console.error(`  ❌ MISSING: ${migrationFile}`);
  } else {
    foundFiles.push(migrationFile);
    console.log(`  ✓ Found: ${migrationFile}`);
  }
}

console.log('');

// Report results
if (missingFiles.length > 0) {
  console.error(`❌ VALIDATION FAILED: ${missingFiles.length} migration file(s) missing:\n`);
  missingFiles.forEach(file => console.error(`  - ${file}`));
  console.error('\nMigration files must be:');
  console.error('  1. Committed to git (check .gitignore)');
  console.error('  2. Present in src/db/migrations/ directory');
  console.error('  3. Referenced in meta/_journal.json\n');
  console.error('This check prevents production failures from missing migration files.');
  process.exit(1);
}

// Success
console.log(`✅ SUCCESS: All ${entries.length} migration file(s) validated successfully!`);
console.log('\nThe following files are ready for deployment:');
foundFiles.forEach(file => console.log(`  - ${file}`));
console.log('');

process.exit(0);
