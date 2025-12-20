import express, { Application } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './api/auth/auth.routes';
import indexersRoutes from './api/admin/indexers.routes';
import settingsRoutes from './api/admin/settings.routes';
import torznabRoutes from './api/torznab/torznab.routes';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

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
app.use('/api/torznab', torznabRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║   🚀 Tinkarr Backend Server           ║
║                                       ║
║   Server running on port ${PORT}        ║
║   Environment: ${process.env.NODE_ENV || 'development'}         ║
║                                       ║
║   API Documentation:                  ║
║   - Health: GET /health               ║
║   - Auth: POST /api/auth/login        ║
║   - Indexers: /api/indexers           ║
║   - Settings: /api/settings           ║
║   - Torznab: /api/torznab/:id         ║
║                                       ║
╚═══════════════════════════════════════╝
  `);
});

export default app;
