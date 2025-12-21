import { Router, Request, Response } from 'express';
import { authService } from '../../services/auth.service';
import { authenticateJWT, requireAdmin } from '../../middleware/auth.middleware';
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

// Change own password
router.post('/change-password', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const result = await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Admin: List all users
router.get('/users', authenticateJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await authService.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Admin: Get user by ID
router.get('/users/:id', authenticateJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await authService.getUserById(userId);
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

// Admin: Reset user password
router.post('/users/:id/reset-password', authenticateJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const result = await authService.resetUserPassword(userId, newPassword);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Admin: Delete user
router.delete('/users/:id', authenticateJWT, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const result = await authService.deleteUser(userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
