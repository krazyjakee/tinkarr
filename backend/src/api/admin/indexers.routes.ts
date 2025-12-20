import { Router, Request, Response } from 'express';
import { indexerService } from '../../services/indexer.service';
import { ScraperService } from '../../services/scraper.service';
import { settingsService } from '../../services/settings.service';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { validateRequest, createIndexerSchema, updateIndexerSchema } from '../../utils/validators';

const scraperService = new ScraperService(settingsService);

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

export default router;
