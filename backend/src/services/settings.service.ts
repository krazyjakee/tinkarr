import { db } from '../db';
import { settings, type Setting } from '../db/schema';
import { eq } from 'drizzle-orm';

export class SettingsService {
  async getAll(): Promise<Setting[]> {
    const allSettings = await db.select().from(settings);
    return allSettings;
  }

  async get(key: string): Promise<string | null> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting?.value || null;
  }

  async set(key: string, value: string): Promise<void> {
    const [existing] = await db.select().from(settings).where(eq(settings.key, key));

    if (existing) {
      await db.update(settings).set({ value, updatedAt: new Date().toISOString() }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  }

  async updateMany(updates: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(updates)) {
      await this.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    await db.delete(settings).where(eq(settings.key, key));
  }
}

export const settingsService = new SettingsService();
