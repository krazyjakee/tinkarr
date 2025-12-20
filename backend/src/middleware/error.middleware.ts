import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${statusCode}: ${message}`, err.stack);

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export function notFoundHandler(req: Request, res: Response) {
  // This should only trigger for API routes in production
  // SPA routes are handled by the catch-all before this
  if (req.path.startsWith('/api')) {
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.path,
    });
  } else {
    // Fallback in case something went wrong with SPA serving
    res.status(404).json({
      error: 'Route not found',
      path: req.path,
    });
  }
}
