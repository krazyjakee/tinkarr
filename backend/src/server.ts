import express, { Application } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Import routes
import authRoutes from './api/auth/auth.routes';
import indexersRoutes from './api/admin/indexers.routes';
import settingsRoutes from './api/admin/settings.routes';
import systemRoutes from './api/admin/system.routes';
import torznabRoutes from './api/torznab/torznab.routes';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8677;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later',
});

app.use('/api', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/indexers', indexersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/torznab', torznabRoutes);

// Frontend serving
if (NODE_ENV === 'production') {
  // Production: Serve static files
  const frontendPath = path.join(__dirname, '..', 'public');

  // Serve static files with caching
  app.use(express.static(frontendPath, {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Set immutable cache for hashed assets
      if (filePath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));

  // SPA fallback - must be AFTER static files
  app.get('*', (req, res) => {
    // Don't serve SPA for API routes or health check (shouldn't reach here but safety check)
    if (req.path.startsWith('/api') || req.path === '/health') {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  // Development: Proxy to Vite dev server
  const VITE_PORT = process.env.VITE_PORT || 5173;

  // Proxy all non-API requests to Vite dev server
  // API routes are already handled above, so they won't reach this middleware
  app.use('/', createProxyMiddleware({
    target: `http://0.0.0.0:${VITE_PORT}`,
    changeOrigin: true,
    ws: true, // Enable websocket proxy for HMR
  }));
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  const mode = NODE_ENV === 'production' ? 'Production' : 'Development';
  console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║   🚀 Tinkarr Unified Service          ║
║                                       ║
║   Running on: http://0.0.0.0:${PORT}     ║
║   Environment: ${NODE_ENV.padEnd(11)}         ║
║   Mode: ${mode.padEnd(19)} ║
║                                       ║
║   Frontend: http://0.0.0.0:${PORT}      ║
║   Health: GET /health                 ║
║   API: /api/*                         ║
║                                       ║${NODE_ENV === 'production' ? `
║   Serving: Static build               ║` : `
║   Serving: Vite dev server (HMR)      ║`}
║                                       ║
╚═══════════════════════════════════════╝
  `);
});

export default app;
