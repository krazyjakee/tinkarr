import { db } from '../db';
import { requestCache } from '../db/schema';
import { eq, lt } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Service for caching HTTP responses
 */
export class CacheService {
  private defaultTtlSeconds: number;

  constructor(ttlSeconds: number = 600) {
    // Default 10 minutes
    this.defaultTtlSeconds = ttlSeconds;
  }

  /**
   * Generate cache key from URL and query parameters
   */
  private generateCacheKey(url: string, params?: Record<string, any>): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    const combined = `${url}:${paramsStr}`;
    return crypto.createHash('md5').update(combined).digest('hex');
  }

  /**
   * Get cached response
   * Returns null if cache miss or expired
   */
  async get(url: string, params?: Record<string, any>): Promise<string | null> {
    try {
      const cacheKey = this.generateCacheKey(url, params);

      const cached = await db
        .select()
        .from(requestCache)
        .where(eq(requestCache.cacheKey, cacheKey))
        .limit(1);

      if (cached.length === 0) {
        return null; // Cache miss
      }

      const entry = cached[0];
      const now = new Date().toISOString();

      // Check if expired
      if (entry.expiresAt < now) {
        // Delete expired entry
        await this.delete(cacheKey);
        return null;
      }

      return entry.response;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Store response in cache
   */
  async set(
    url: string,
    response: string,
    params?: Record<string, any>,
    ttlSeconds?: number
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(url, params);
      const ttl = ttlSeconds ?? this.defaultTtlSeconds;

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

      // Insert or replace
      await db
        .insert(requestCache)
        .values({
          cacheKey,
          response,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: requestCache.cacheKey,
          set: {
            response,
            expiresAt,
            createdAt: new Date().toISOString(),
          },
        });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete specific cache entry
   */
  async delete(cacheKey: string): Promise<void> {
    try {
      await db.delete(requestCache).where(eq(requestCache.cacheKey, cacheKey));
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    try {
      await db.delete(requestCache);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpired(): Promise<void> {
    try {
      const now = new Date().toISOString();
      await db.delete(requestCache).where(lt(requestCache.expiresAt, now));
    } catch (error) {
      console.error('Cache clear expired error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    total: number;
    expired: number;
    active: number;
  }> {
    try {
      const all = await db.select().from(requestCache);
      const now = new Date().toISOString();

      const total = all.length;
      const expired = all.filter((entry) => entry.expiresAt < now).length;
      const active = total - expired;

      return { total, expired, active };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { total: 0, expired: 0, active: 0 };
    }
  }

  /**
   * Invalidate cache for specific indexer
   */
  async invalidateIndexer(indexerId: number): Promise<void> {
    try {
      // Find all cache entries that match indexer ID pattern
      const all = await db.select().from(requestCache);
      const pattern = `indexer:${indexerId}`;

      for (const entry of all) {
        // If cache key contains indexer ID, delete it
        // This is a simple implementation; could be improved with better key structure
        if (entry.cacheKey.includes(pattern)) {
          await this.delete(entry.cacheKey);
        }
      }
    } catch (error) {
      console.error('Cache invalidate indexer error:', error);
    }
  }
}
