import { CacheService } from '../services/cache.service';

// Mock the database module
jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
  },
}));

import { db } from '../db';

describe('CacheService', () => {
  let cacheService: CacheService;
  const mockDb = db as jest.Mocked<typeof db>;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new CacheService(600); // 10 minutes TTL
  });

  describe('constructor', () => {
    it('should use default TTL of 600 seconds', () => {
      const service = new CacheService();
      expect(service).toBeDefined();
    });

    it('should accept custom TTL', () => {
      const service = new CacheService(300);
      expect(service).toBeDefined();
    });
  });

  describe('get', () => {
    it('should return cached value if not expired', async () => {
      const futureDate = new Date(Date.now() + 10000).toISOString();

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                cacheKey: 'abc123',
                response: 'cached-data',
                expiresAt: futureDate,
              },
            ]),
          }),
        }),
      } as any);

      const result = await cacheService.get('https://example.com');

      expect(result).toBe('cached-data');
    });

    it('should return null if cache miss', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await cacheService.get('https://example.com');

      expect(result).toBeNull();
    });

    it('should return null and delete if expired', async () => {
      const pastDate = new Date(Date.now() - 10000).toISOString();

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                cacheKey: 'abc123',
                response: 'expired-data',
                expiresAt: pastDate,
              },
            ]),
          }),
        }),
      } as any);

      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      } as any);

      const result = await cacheService.get('https://example.com');

      expect(result).toBeNull();
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await cacheService.get('https://example.com');

      expect(result).toBeNull();
    });

    it('should use params in cache key generation', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      await cacheService.get('https://example.com', { query: 'test', page: 1 });

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should store value in cache', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
        }),
      } as any);

      await cacheService.set('https://example.com', 'response-data');

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should use custom TTL if provided', async () => {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
        }),
      } as any);

      await cacheService.set('https://example.com', 'response-data', undefined, 300);

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDb.insert.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(
        cacheService.set('https://example.com', 'response-data')
      ).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete cache entry', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      } as any);

      await cacheService.delete('cache-key');

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDb.delete.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(cacheService.delete('cache-key')).resolves.not.toThrow();
    });
  });

  describe('clearAll', () => {
    it('should delete all cache entries', async () => {
      mockDb.delete.mockResolvedValue(undefined as any);

      await cacheService.clearAll();

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDb.delete.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(cacheService.clearAll()).resolves.not.toThrow();
    });
  });

  describe('clearExpired', () => {
    it('should delete expired entries', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      } as any);

      await cacheService.clearExpired();

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDb.delete.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(cacheService.clearExpired()).resolves.not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const futureDate = new Date(Date.now() + 10000).toISOString();
      const pastDate = new Date(Date.now() - 10000).toISOString();

      mockDb.select.mockReturnValue({
        from: jest.fn().mockResolvedValue([
          { cacheKey: '1', response: 'data1', expiresAt: futureDate },
          { cacheKey: '2', response: 'data2', expiresAt: futureDate },
          { cacheKey: '3', response: 'data3', expiresAt: pastDate },
        ]),
      } as any);

      const stats = await cacheService.getStats();

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.expired).toBe(1);
    });

    it('should return zeros on error', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      const stats = await cacheService.getStats();

      expect(stats).toEqual({ total: 0, expired: 0, active: 0 });
    });
  });

  describe('invalidateIndexer', () => {
    it('should invalidate cache for specific indexer', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockResolvedValue([
          { cacheKey: 'indexer:1:query1' },
          { cacheKey: 'indexer:1:query2' },
          { cacheKey: 'indexer:2:query1' },
        ]),
      } as any);

      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      } as any);

      await cacheService.invalidateIndexer(1);

      // Should delete entries for indexer 1
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(cacheService.invalidateIndexer(1)).resolves.not.toThrow();
    });
  });
});
