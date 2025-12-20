import { Router, Request, Response } from 'express';
import { HealthService } from '../../services/health.service';
import { CacheService } from '../../services/cache.service';
import { settingsService } from '../../services/settings.service';
import { authenticateJWT } from '../../middleware/auth.middleware';

const healthService = new HealthService();
const cacheService = new CacheService();

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// System health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await healthService.checkSystemHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Check all indexers health
router.get('/health/indexers', async (req: Request, res: Response) => {
  try {
    const indexersHealth = await healthService.checkAllIndexers();
    res.json(indexersHealth);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Detect dead indexers
router.get('/health/dead-indexers', async (req: Request, res: Response) => {
  try {
    const deadIndexers = await healthService.detectDeadIndexers();
    res.json({
      count: deadIndexers.length,
      indexers: deadIndexers,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Cache statistics
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = await cacheService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Clear all cache
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    await cacheService.clearAll();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Clear expired cache entries
router.post('/cache/clear-expired', async (req: Request, res: Response) => {
  try {
    await cacheService.clearExpired();
    res.json({ success: true, message: 'Expired cache entries cleared' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Invalidate cache for specific indexer
router.post('/cache/invalidate/:indexerId', async (req: Request, res: Response) => {
  try {
    const indexerId = parseInt(req.params.indexerId);
    await cacheService.invalidateIndexer(indexerId);
    res.json({ success: true, message: `Cache invalidated for indexer ${indexerId}` });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
