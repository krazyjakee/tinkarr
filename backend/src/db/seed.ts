import { db } from './index';
import { users, settings } from './schema';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log('Seeding database...');

  try {
    // Generate API key
    const apiKey = crypto.randomBytes(32).toString('hex');

    // Hash default password
    const defaultPassword = 'admin123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    // Create admin user
    const existingUser = db.select().from(users).all();

    if (existingUser.length === 0) {
      await db.insert(users).values({
        username: 'admin',
        passwordHash,
        apiKey,
      });

      console.log('✓ Created admin user');
      console.log('  Username: admin');
      console.log('  Password: admin123');
      console.log(`  API Key: ${apiKey}`);
      console.log('  IMPORTANT: Change the password after first login!');
    } else {
      console.log('✓ Admin user already exists');
    }

    // Create default settings
    const defaultSettings = [
      { key: 'flaresolverr_url', value: process.env.FLARESOLVERR_URL || 'http://localhost:8191/v1' },
      { key: 'flaresolverr_enabled', value: process.env.FLARESOLVERR_ENABLED || 'true' },
      { key: 'max_results_per_indexer', value: process.env.MAX_RESULTS_PER_INDEXER || '100' },
      { key: 'cache_ttl_seconds', value: process.env.CACHE_TTL_SECONDS || '600' },
      { key: 'global_timeout_ms', value: process.env.GLOBAL_TIMEOUT_MS || '30000' },
    ];

    for (const setting of defaultSettings) {
      const existing = db.select().from(settings).all();
      const found = existing.find((s: any) => s.key === setting.key);

      if (!found) {
        await db.insert(settings).values(setting);
        console.log(`✓ Created setting: ${setting.key}`);
      }
    }

    console.log('\nSeeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
