import express, { Request, Response, NextFunction } from 'express';
import { authService } from '../../services/auth.service';
import { indexerService } from '../../services/indexer.service';
import { ScraperService } from '../../services/scraper.service';
import { torznabService } from '../../services/torznab.service';
import { settingsService } from '../../services/settings.service';

const router = express.Router();

/**
 * Middleware to validate Torznab API key
 */
async function validateApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = req.query.apikey as string;

    if (!apiKey) {
      return res.status(401).send(generateErrorXml('No API key provided'));
    }

    // Validate API key
    try {
      await authService.getUserByApiKey(apiKey);
      next();
    } catch (error) {
      return res.status(401).send(generateErrorXml('Invalid API key'));
    }
  } catch (error: any) {
    return res.status(500).send(generateErrorXml('Authentication error'));
  }
}

/**
 * Generate error XML response
 */
function generateErrorXml(message: string, code: number = 100): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<error code="${code}" description="${escapeXml(message)}" />`;
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * GET /api/torznab/:indexerId
 * Main Torznab endpoint that handles all query types
 */
router.get('/:indexerId', validateApiKey, async (req: Request, res: Response) => {
  try {
    const indexerId = parseInt(req.params.indexerId, 10);
    const queryType = (req.query.t as string) || 'search';

    // Get indexer
    let indexer;
    try {
      indexer = await indexerService.getById(indexerId);
    } catch (error) {
      return res
        .status(404)
        .send(generateErrorXml(`Indexer ${indexerId} not found`, 200));
    }

    // Check if indexer is enabled
    if (!indexer.enabled) {
      return res
        .status(503)
        .send(generateErrorXml(`Indexer ${indexer.title} is disabled`, 201));
    }

    // Set response content type
    res.set('Content-Type', 'application/xml');

    // Handle different query types
    switch (queryType) {
      case 'caps':
        return handleCapsRequest(indexer, res);

      case 'search':
        return await handleSearchRequest(indexer, req, res);

      case 'tvsearch':
      case 'tv-search':
        return await handleTvSearchRequest(indexer, req, res);

      case 'movie':
      case 'moviesearch':
      case 'movie-search':
        return await handleMovieSearchRequest(indexer, req, res);

      default:
        return res
          .status(400)
          .send(generateErrorXml(`Unsupported query type: ${queryType}`, 202));
    }
  } catch (error: any) {
    console.error('Torznab error:', error);
    return res.status(500).send(generateErrorXml(error.message || 'Internal server error'));
  }
});

/**
 * Handle capabilities request (t=caps)
 */
function handleCapsRequest(indexer: any, res: Response) {
  const xml = torznabService.generateCapsXml(indexer.title);
  return res.send(xml);
}

/**
 * Handle general search request (t=search)
 */
async function handleSearchRequest(indexer: any, req: Request, res: Response) {
  const query = (req.query.q as string) || '';
  const limit = parseInt((req.query.limit as string) || '100', 10);
  const offset = parseInt((req.query.offset as string) || '0', 10);

  // Execute search
  const scraper = new ScraperService(settingsService);
  const result = await scraper.scrape(
    {
      id: indexer.id,
      title: indexer.title,
      url: indexer.url,
      requiresFlaresolverr: indexer.requiresFlaresolverr,
      searchType: indexer.searchType,
      searchUrl: indexer.searchUrl,
      searchMethod: indexer.searchMethod,
      searchParams: indexer.searchParams ? JSON.parse(indexer.searchParams) : null,
      searchQueryParam: indexer.searchQueryParam,
      resultSelector: indexer.resultSelector,
      resultMapping: indexer.resultMapping ? JSON.parse(indexer.resultMapping) : null,
    },
    query
  );

  if (!result.success) {
    return res.status(500).send(generateErrorXml(result.error || 'Search failed', 300));
  }

  // Convert to Torznab format
  const torznabItems = torznabService.convertToTorznabItems(result.data);

  // Apply pagination
  const paginatedItems = torznabItems.slice(offset, offset + limit);

  // Generate RSS XML
  const xml = torznabService.generateRssXml(indexer.title, paginatedItems);

  return res.send(xml);
}

/**
 * Handle TV search request (t=tvsearch)
 */
async function handleTvSearchRequest(indexer: any, req: Request, res: Response) {
  const query = (req.query.q as string) || '';
  const season = req.query.season as string;
  const episode = req.query.ep as string;
  const limit = parseInt((req.query.limit as string) || '100', 10);
  const offset = parseInt((req.query.offset as string) || '0', 10);

  // Build TV-specific query
  let searchQuery = query;
  if (season && episode) {
    searchQuery += ` S${season.padStart(2, '0')}E${episode.padStart(2, '0')}`;
  } else if (season) {
    searchQuery += ` Season ${season}`;
  }

  // Execute search
  const scraper = new ScraperService(settingsService);
  const result = await scraper.scrape(
    {
      id: indexer.id,
      title: indexer.title,
      url: indexer.url,
      requiresFlaresolverr: indexer.requiresFlaresolverr,
      searchType: indexer.searchType,
      searchUrl: indexer.searchUrl,
      searchMethod: indexer.searchMethod,
      searchParams: indexer.searchParams ? JSON.parse(indexer.searchParams) : null,
      searchQueryParam: indexer.searchQueryParam,
      resultSelector: indexer.resultSelector,
      resultMapping: indexer.resultMapping ? JSON.parse(indexer.resultMapping) : null,
    },
    searchQuery
  );

  if (!result.success) {
    return res.status(500).send(generateErrorXml(result.error || 'Search failed', 300));
  }

  // Convert to Torznab format with TV category
  const torznabItems = torznabService.convertToTorznabItems(result.data, 5000); // TV category

  // Apply pagination
  const paginatedItems = torznabItems.slice(offset, offset + limit);

  // Generate RSS XML
  const xml = torznabService.generateRssXml(indexer.title, paginatedItems);

  return res.send(xml);
}

/**
 * Handle movie search request (t=movie)
 */
async function handleMovieSearchRequest(indexer: any, req: Request, res: Response) {
  const query = (req.query.q as string) || '';
  const imdbId = req.query.imdbid as string;
  const limit = parseInt((req.query.limit as string) || '100', 10);
  const offset = parseInt((req.query.offset as string) || '0', 10);

  // Build movie-specific query
  let searchQuery = query;
  if (imdbId) {
    searchQuery = imdbId;
  }

  // Execute search
  const scraper = new ScraperService(settingsService);
  const result = await scraper.scrape(
    {
      id: indexer.id,
      title: indexer.title,
      url: indexer.url,
      requiresFlaresolverr: indexer.requiresFlaresolverr,
      searchType: indexer.searchType,
      searchUrl: indexer.searchUrl,
      searchMethod: indexer.searchMethod,
      searchParams: indexer.searchParams ? JSON.parse(indexer.searchParams) : null,
      searchQueryParam: indexer.searchQueryParam,
      resultSelector: indexer.resultSelector,
      resultMapping: indexer.resultMapping ? JSON.parse(indexer.resultMapping) : null,
    },
    searchQuery
  );

  if (!result.success) {
    return res.status(500).send(generateErrorXml(result.error || 'Search failed', 300));
  }

  // Convert to Torznab format with Movies category
  const torznabItems = torznabService.convertToTorznabItems(result.data, 2000); // Movies category

  // Apply pagination
  const paginatedItems = torznabItems.slice(offset, offset + limit);

  // Generate RSS XML
  const xml = torznabService.generateRssXml(indexer.title, paginatedItems);

  return res.send(xml);
}

export default router;
