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
  favicon: z.string().nullish(),
  requiresFlaresolverr: z.boolean().default(false),
  enabled: z.boolean().default(true),

  searchType: z.enum(['html_form', 'rest_api', 'none']).nullish(),
  searchUrl: z.string().url().nullish(),
  searchMethod: z.enum(['GET', 'POST']).nullish(),
  searchParams: z.record(z.any()).nullish(),
  searchQueryParam: z.string().nullish(),

  rssUrl: z.string().url().nullish(),
  rssType: z.enum(['rest_api', 'static', 'none']).nullish(),
  rssParams: z.record(z.any()).nullish(),

  resultSelector: z.string().nullish(),
  resultMapping: z.record(z.string()).nullish(),
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
