import { Router, Request, Response } from 'express';
import { settingsService } from '../../services/settings.service';
import { FlaresolverrService } from '../../services/flaresolverr.service';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { validateRequest, updateSettingsSchema } from '../../utils/validators';

const flaresolverrService = new FlaresolverrService(settingsService);

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// Get all settings
router.get('/', async (req: Request, res: Response) => {
  try {
    const allSettings = await settingsService.getAll();
    res.json(allSettings);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Test Flaresolverr connection - must be BEFORE parametric routes
router.post('/flaresolverr/test', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    const result = await flaresolverrService.testConnection(url);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Get specific setting
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const value = await settingsService.get(req.params.key);
    if (value === null) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json({ key: req.params.key, value });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update settings
router.put('/', validateRequest(updateSettingsSchema), async (req: Request, res: Response) => {
  try {
    await settingsService.updateMany(req.body);
    const updated = await settingsService.getAll();
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Update single setting
router.put('/:key', async (req: Request, res: Response) => {
  try {
    const { value } = req.body;
    if (typeof value !== 'string') {
      return res.status(400).json({ error: 'Value must be a string' });
    }
    await settingsService.set(req.params.key, value);
    res.json({ key: req.params.key, value });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Delete setting
router.delete('/:key', async (req: Request, res: Response) => {
  try {
    await settingsService.delete(req.params.key);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
