import { Router, Request, Response } from 'express';
import { indexerService } from '../../services/indexer.service';
import { ScraperService } from '../../services/scraper.service';
import { settingsService } from '../../services/settings.service';
import { FaviconService } from '../../services/favicon.service';
import { ImportExportService } from '../../services/import-export.service';
import { HealthService } from '../../services/health.service';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { validateRequest, createIndexerSchema, updateIndexerSchema } from '../../utils/validators';

const scraperService = new ScraperService(settingsService);
const faviconService = new FaviconService();
const importExportService = new ImportExportService();
const healthService = new HealthService();

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// Get all indexers
router.get('/', async (req: Request, res: Response) => {
  try {
    const indexers = await indexerService.getAll();
    res.json(indexers);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get indexer by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const indexer = await indexerService.getById(id);
    res.json(indexer);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

// Create new indexer
router.post('/', validateRequest(createIndexerSchema), async (req: Request, res: Response) => {
  try {
    const indexer = await indexerService.create(req.body);
    res.status(201).json(indexer);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Auto-configure indexer from URL (standalone, doesn't require existing indexer)
// IMPORTANT: This must be BEFORE /:id routes to avoid matching "auto-configure" as an ID
router.post('/auto-configure', async (req: Request, res: Response) => {
  try {
    const { url, useFlaresolverr } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Auto-configure from URL (use Flaresolverr if requested)
    const result = await scraperService.autoConfigureFromUrl(url, useFlaresolverr || false);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update indexer
router.put('/:id', validateRequest(updateIndexerSchema), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const indexer = await indexerService.update(id, req.body);
    res.json(indexer);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Delete indexer
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await indexerService.delete(id);
    res.status(204).send();
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

// Toggle indexer enabled status
router.post('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const indexer = await indexerService.toggle(id);
    res.json(indexer);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

// Test indexer
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const query = req.body.query || 'test';

    // Get indexer from database
    const indexer = await indexerService.getById(id);

    // Convert to ScraperService format
    const indexerConfig = {
      id: indexer.id,
      title: indexer.title,
      url: indexer.url,
      requiresFlaresolverr: indexer.requiresFlaresolverr,
      searchType: indexer.searchType,
      searchUrl: indexer.searchUrl,
      searchMethod: indexer.searchMethod,
      searchParams: indexer.searchParams,
      searchQueryParam: indexer.searchQueryParam,
      resultSelector: indexer.resultSelector,
      resultMapping: indexer.resultMapping,
    };

    // Test the indexer
    const result = await scraperService.testIndexer(indexerConfig, query, {
      useFlaresolverr: req.body.useFlaresolverr,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Auto-detect search forms and RSS feeds
router.post('/:id/auto-detect', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const indexer = await indexerService.getById(id);

    // Auto-detect using the indexer's base URL
    const result = await scraperService.autoDetect(indexer.url);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Auto-configure existing indexer
router.post('/:id/auto-configure', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const indexer = await indexerService.getById(id);

    // Auto-configure using the indexer's base URL
    const result = await scraperService.autoConfigureFromUrl(indexer.url);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Fetch favicon for indexer
router.post('/:id/fetch-favicon', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const indexer = await indexerService.getById(id);

    // Fetch favicon
    const favicon = await faviconService.fetchFavicon(indexer.url);

    if (favicon) {
      // Update indexer with favicon
      await indexerService.update(id, { favicon });
      res.json({ success: true, favicon });
    } else {
      res.json({ success: false, message: 'Failed to fetch favicon' });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Check indexer health
router.get('/:id/health', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const health = await healthService.checkIndexerHealth(id);
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Export all indexers
router.get('/export/all', async (req: Request, res: Response) => {
  try {
    const exportData = await importExportService.exportIndexers();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tinkarr-indexers-${new Date().toISOString().split('T')[0]}.json"`
    );
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Export specific indexers
router.post('/export', async (req: Request, res: Response) => {
  try {
    const indexerIds = req.body.indexerIds as number[];
    const exportData = await importExportService.exportIndexers(indexerIds);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tinkarr-indexers-${new Date().toISOString().split('T')[0]}.json"`
    );
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Import indexers
router.post('/import', async (req: Request, res: Response) => {
  try {
    const importData = req.body.data;
    const options = {
      overwrite: req.body.overwrite ?? false,
      skipExisting: req.body.skipExisting ?? true,
    };

    // Validate import data
    const validation = importExportService.validateImportData(importData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors,
      });
    }

    const result = await importExportService.importIndexers(importData, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create backup
router.get('/backup/create', async (req: Request, res: Response) => {
  try {
    const backup = await importExportService.createBackup();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tinkarr-backup-${new Date().toISOString().split('T')[0]}.json"`
    );
    res.send(backup);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Restore backup
router.post('/backup/restore', async (req: Request, res: Response) => {
  try {
    const backupJson = req.body.backup;
    if (typeof backupJson !== 'string') {
      return res.status(400).json({ error: 'Backup must be a JSON string' });
    }

    const result = await importExportService.restoreBackup(backupJson);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
