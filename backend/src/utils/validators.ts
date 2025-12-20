import { z } from 'zod';

// Auth validation schemas
export const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Indexer validation schemas
export const createIndexerSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  url: z.string().url('Invalid URL'),
  favicon: z.string().optional(),
  requiresFlaresolverr: z.boolean().default(false),
  enabled: z.boolean().default(true),

  searchType: z.enum(['html_form', 'rest_api', 'none']).optional(),
  searchUrl: z.string().url().optional(),
  searchMethod: z.enum(['GET', 'POST']).optional(),
  searchParams: z.record(z.any()).optional(),
  searchQueryParam: z.string().optional(),

  rssUrl: z.string().url().optional(),
  rssType: z.enum(['rest_api', 'static', 'none']).optional(),
  rssParams: z.record(z.any()).optional(),

  resultSelector: z.string().optional(),
  resultMapping: z.record(z.string()).optional(),
});

export const updateIndexerSchema = createIndexerSchema.partial();

// Settings validation schemas
export const updateSettingsSchema = z.record(z.string());

// Validation middleware helper
export function validateRequest(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}
