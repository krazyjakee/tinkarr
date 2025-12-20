import { Router, Request, Response } from 'express';
import { authService } from '../../services/auth.service';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { validateRequest, loginSchema, registerSchema } from '../../utils/validators';

const router = Router();

// Login
router.post('/login', validateRequest(loginSchema), async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
});

// Register (optional - can be disabled in production)
router.post('/register', validateRequest(registerSchema), async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body.username, req.body.password);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Get current user
router.get('/me', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const user = await authService.getUserById(req.user!.userId);
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

// Regenerate API key
router.post('/regenerate-api-key', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const newApiKey = await authService.regenerateApiKey(req.user!.userId);
    res.json({ apiKey: newApiKey });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Logout (client-side only - just remove token)
router.post('/logout', authenticateJWT, (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
