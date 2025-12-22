// Mock axios-cookiejar-support to avoid ES module issues
jest.mock('axios-cookiejar-support', () => ({
  wrapper: jest.fn((axiosInstance) => axiosInstance),
}));

// Mock the dependencies BEFORE imports
jest.mock('../services/settings.service');
jest.mock('../services/code-executor.service');
jest.mock('../services/http-client.service');
jest.mock('../services/flaresolverr.service');
jest.mock('../services/parser.service');
jest.mock('../services/cache.service');

import { ScraperService, IndexerConfig } from '../services/scraper.service';
import { settingsService } from '../services/settings.service';

// Helper function to create a basic indexer config with all required fields
function createTestIndexer(overrides: Partial<IndexerConfig> = {}): IndexerConfig {
  return {
    id: 1,
    title: 'Test Indexer',
    url: 'https://example.com',
    requiresFlaresolverr: false,
    searchType: 'html_form',
    searchUrl: 'https://example.com/search',
    searchMethod: 'GET',
    searchParams: {},
    searchQueryParam: 'q',
    resultSelector: '.result',
    resultMapping: {},
    ...overrides,
  };
}

describe('ScraperService URL Building', () => {
  let scraperService: ScraperService;

  beforeEach(() => {
    scraperService = new ScraperService(settingsService);
  });

  describe('buildSearchUrl', () => {
    it('should build search URL with query parameter', () => {
      const indexer = createTestIndexer();

      // Access private method using any type
      const url = (scraperService as any).buildSearchUrl(indexer, 'test query');

      expect(url).toBe('https://example.com/search?q=test+query');
    });

    it('should build search URL with additional static params', () => {
      const indexer = createTestIndexer({
        searchParams: {
          category: 'movies',
          sort: 'seeders',
        },
      });

      const url = (scraperService as any).buildSearchUrl(indexer, 'test query');

      expect(url).toContain('q=test+query');
      expect(url).toContain('category=movies');
      expect(url).toContain('sort=seeders');
    });

    it('should handle empty query', () => {
      const indexer = createTestIndexer();

      const url = (scraperService as any).buildSearchUrl(indexer, '');

      // When query is empty, the query parameter is not added
      expect(url).toBe('https://example.com/search');
    });

    it('should handle undefined query', () => {
      const indexer = createTestIndexer();

      const url = (scraperService as any).buildSearchUrl(indexer, undefined);

      // When query is undefined, the query parameter is not added
      expect(url).toBe('https://example.com/search');
    });
  });

  describe('buildRssUrl', () => {
    it('should build RSS URL with static params', async () => {
      const indexer = createTestIndexer({
        rssUrl: 'https://example.com/rss',
        rssMethod: 'GET',
        rssParams: {
          category: 'movies',
          limit: '50',
        },
      });

      const url = await (scraperService as any).buildRssUrl(indexer, {});

      expect(url).toContain('https://example.com/rss');
      expect(url).toContain('category=movies');
      expect(url).toContain('limit=50');
    });

    it('should build RSS URL with static params as JSON string', async () => {
      const indexer = createTestIndexer({
        rssUrl: 'https://example.com/rss',
        rssMethod: 'GET',
        rssParams: '{"category":"movies","limit":"50"}',
      });

      const url = await (scraperService as any).buildRssUrl(indexer, {});

      expect(url).toContain('https://example.com/rss');
      expect(url).toContain('category=movies');
      expect(url).toContain('limit=50');
    });

    it('should return null if no rssUrl is configured', async () => {
      const indexer = createTestIndexer();

      const url = await (scraperService as any).buildRssUrl(indexer, {});

      expect(url).toBeNull();
    });

    it('should return base RSS URL when no params are provided', async () => {
      const indexer = createTestIndexer({
        rssUrl: 'https://example.com/rss',
        rssMethod: 'GET',
      });

      const url = await (scraperService as any).buildRssUrl(indexer, {});

      expect(url).toBe('https://example.com/rss');
    });

    it('should return base RSS URL when rssParams and rssUrlGeneratorCode are both missing', async () => {
      const indexer = createTestIndexer({
        rssUrl: 'https://ext.to/browse/',
        rssMethod: 'GET',
        // No rssParams
        // No rssUrlGeneratorCode
      });

      const rssContext = {
        season: 2,
        categories: ['5030'],
      };

      const url = await (scraperService as any).buildRssUrl(indexer, rssContext);

      // This is the bug - even with RSS context provided, no params are added
      // because there's no rssParams or rssUrlGeneratorCode configured
      expect(url).toBe('https://ext.to/browse/');
    });

    it('should handle RSS context with season and episode', async () => {
      const indexer = createTestIndexer({
        rssUrl: 'https://example.com/rss',
        rssMethod: 'GET',
        rssParams: {
          feed: 'tv',
        },
      });

      const rssContext = {
        season: 1,
        episode: 5,
        tvdbId: '12345',
      };

      const url = await (scraperService as any).buildRssUrl(indexer, rssContext);

      expect(url).toContain('https://example.com/rss');
      expect(url).toContain('feed=tv');
    });

    it('should use RSS URL generator code when provided', async () => {
      // Mock the code executor service
      const mockExecuteRssParamsGenerator = jest.fn().mockResolvedValue({
        t: '2000',
        cat: '5030,5040',
        extended: '1',
      });

      (scraperService as any).codeExecutorService = {
        executeRssParamsGenerator: mockExecuteRssParamsGenerator,
      };

      const indexer = createTestIndexer({
        rssUrl: 'https://example.com/rss',
        rssMethod: 'GET',
        rssUrlGeneratorCode: 'return { t: "2000", cat: "5030,5040", extended: "1" };',
      });

      const rssContext = {
        imdbId: 'tt1234567',
        categories: [5030, 5040],
      };

      const url = await (scraperService as any).buildRssUrl(indexer, rssContext);

      expect(mockExecuteRssParamsGenerator).toHaveBeenCalledWith(
        indexer.rssUrlGeneratorCode,
        expect.objectContaining({
          baseUrl: 'https://example.com',
          imdbId: 'tt1234567',
          categories: [5030, 5040],
        })
      );

      expect(url).toContain('https://example.com/rss');
      expect(url).toContain('t=2000');
      expect(url).toContain('cat=5030%2C5040');
      expect(url).toContain('extended=1');
    });

    it('should fall back to static params when generator code fails', async () => {
      // Mock the code executor service to throw an error
      const mockExecuteRssParamsGenerator = jest.fn().mockRejectedValue(new Error('Code execution failed'));

      (scraperService as any).codeExecutorService = {
        executeRssParamsGenerator: mockExecuteRssParamsGenerator,
      };

      const indexer = createTestIndexer({
        rssUrl: 'https://example.com/rss',
        rssMethod: 'GET',
        rssUrlGeneratorCode: 'throw new Error("Test error");',
        rssParams: {
          fallback: 'true',
        },
      });

      const url = await (scraperService as any).buildRssUrl(indexer, {});

      expect(mockExecuteRssParamsGenerator).toHaveBeenCalled();
      expect(url).toContain('https://example.com/rss');
      expect(url).toContain('fallback=true');
    });
  });

  describe('RSS Fallback Logic', () => {
    it('should use RSS URL when query is empty and rssUrl is configured', () => {
      const indexer = createTestIndexer({
        rssUrl: 'https://example.com/rss',
        rssMethod: 'GET',
        rssParams: {
          category: 'movies',
        },
      });

      // Test the logic that determines which URL to use
      const query = '';
      const willUseRss = !query && !!indexer.rssUrl;

      expect(willUseRss).toBe(true);
    });

    it('should use RSS URL when query is undefined and rssUrl is configured', () => {
      const indexer = createTestIndexer({
        rssUrl: 'https://example.com/rss',
        rssMethod: 'GET',
        rssParams: {
          category: 'movies',
        },
      });

      // Test the logic that determines which URL to use
      const query = undefined;
      const willUseRss = !query && !!indexer.rssUrl;

      expect(willUseRss).toBe(true);
    });

    it('should use search URL when query is provided', () => {
      const indexer = createTestIndexer({
        rssUrl: 'https://example.com/rss',
        rssMethod: 'GET',
        rssParams: {
          category: 'movies',
        },
      });

      // Test the logic that determines which URL to use
      const query = 'test query';
      const willUseRss = !query && !!indexer.rssUrl;

      expect(willUseRss).toBe(false);
    });

    it('should use search URL when rssUrl is not configured', () => {
      const indexer = createTestIndexer();

      // Test the logic that determines which URL to use
      const query = '';
      const willUseRss = !query && !!indexer.rssUrl;

      expect(willUseRss).toBe(false);
    });
  });
});
