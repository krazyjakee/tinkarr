import { HttpClientService } from './http-client.service';
import { FlaresolverrService } from './flaresolverr.service';
import { ParserService, ParsedResult } from './parser.service';
import { SettingsService } from './settings.service';
import { CacheService } from './cache.service';

/**
 * Custom error class that preserves HTTP status code
 */
class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public url: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface IndexerConfig {
  id: number;
  title: string;
  url: string;
  requiresFlaresolverr: boolean;
  searchType: string | null;
  searchUrl: string | null;
  searchMethod: string | null;
  searchParams: any;
  searchQueryParam: string | null;
  rssUrl?: string | null;
  rssParams?: any;
  resultSelector: string | null;
  resultMapping: any;
  resultMappingType?: string | null;
  resultMappingCode?: string | null;
}

export interface ScraperOptions {
  timeout?: number;
  useFlaresolverr?: boolean;
  forceFlaresolverr?: boolean;
  skipCache?: boolean;
}

export interface ScraperResult {
  success: boolean;
  data: ParsedResult[];
  html?: string;
  error?: string;
  usedFlaresolverr: boolean;
  url: string;
  statusCode: number;
}

export class ScraperService {
  private httpClient: HttpClientService;
  private flaresolverrService: FlaresolverrService;
  private parserService: ParserService;
  private cacheService: CacheService;
  private cacheEnabled: boolean;

  constructor(settingsService: SettingsService, cacheEnabled: boolean = true) {
    this.httpClient = new HttpClientService();
    this.flaresolverrService = new FlaresolverrService(settingsService);
    this.parserService = new ParserService();
    this.cacheService = new CacheService();
    this.cacheEnabled = cacheEnabled;
  }

  /**
   * Scrape a website using indexer configuration
   */
  public async scrape(
    indexer: IndexerConfig,
    query?: string,
    options: ScraperOptions = {}
  ): Promise<ScraperResult> {
    // Determine the target URL
    // If query is empty and RSS URL is configured, use RSS URL
    // Otherwise use search URL
    let targetUrl: string | null;
    let method = indexer.searchMethod || 'GET'; // Default to search method, might need RSS method in future

    if (!query && indexer.rssUrl) {
      targetUrl = this.buildRssUrl(indexer);
    } else {
      targetUrl = this.buildSearchUrl(indexer, query);
    }

    if (!targetUrl) {
      return {
        success: false,
        data: [],
        error: 'No search URL configured for this indexer',
        usedFlaresolverr: false,
        url: indexer.url,
        statusCode: 0,
      };
    }

    // Check cache first (skip if skipCache option is set)
    if (this.cacheEnabled && query && !options.skipCache) {
      const cacheKey = `indexer:${indexer.id}:query:${query}`;
      const cached = await this.cacheService.get(targetUrl, { query, indexerId: indexer.id });

      if (cached) {
        try {
          const cachedResult = JSON.parse(cached) as ScraperResult;
          return { ...cachedResult, fromCache: true } as any;
        } catch (error) {
          // Invalid cache, continue with fresh request
          console.warn('Invalid cache data, fetching fresh');
        }
      }
    }

    // Check if we should prioritize Flaresolverr
    const requiresFlaresolverr = options.forceFlaresolverr || indexer.requiresFlaresolverr;
    const flaresolverrEnabled = await this.flaresolverrService.isEnabled();

    let html: string;
    let statusCode: number;
    let usedFlaresolverr = false;
    let actualUrl = targetUrl;

    try {
      if (requiresFlaresolverr) {
        // When Flaresolverr is required, ALWAYS use it first
        if (!flaresolverrEnabled) {
          throw new Error('Flaresolverr is required for this indexer but is not enabled');
        }

        try {
          const result = await this.fetchWithFlaresolverr(targetUrl, method);
          html = result.html;
          statusCode = result.statusCode;
          actualUrl = result.url;
          usedFlaresolverr = true;
        } catch (flaresolverrError: any) {
          console.warn(`Flaresolverr failed, falling back to direct request: ${flaresolverrError.message}`);

          // Fallback to direct request
          const result = await this.fetchDirect(targetUrl, method, options.timeout);
          html = result.html;
          statusCode = result.statusCode;
          actualUrl = result.url;
          usedFlaresolverr = false;
        }
      } else if (options.useFlaresolverr && flaresolverrEnabled) {
        // Flaresolverr is preferred but not required - use it first
        try {
          const result = await this.fetchWithFlaresolverr(targetUrl, method);
          html = result.html;
          statusCode = result.statusCode;
          actualUrl = result.url;
          usedFlaresolverr = true;
        } catch (flaresolverrError: any) {
          console.warn(`Flaresolverr failed, falling back to direct request: ${flaresolverrError.message}`);

          // Fallback to direct request
          const result = await this.fetchDirect(targetUrl, method, options.timeout);
          html = result.html;
          statusCode = result.statusCode;
          actualUrl = result.url;
          usedFlaresolverr = false;
        }
      } else {
        // Try direct request first
        try {
          const result = await this.fetchDirect(targetUrl, method, options.timeout);
          html = result.html;
          statusCode = result.statusCode;
          actualUrl = result.url;
          usedFlaresolverr = false;
        } catch (directError: any) {
          // If direct request fails and Flaresolverr is available, try it as fallback
          if (flaresolverrEnabled) {
            console.warn(`Direct request failed, trying Flaresolverr: ${directError.message}`);
            const result = await this.fetchWithFlaresolverr(targetUrl, method);
            html = result.html;
            statusCode = result.statusCode;
            actualUrl = result.url;
            usedFlaresolverr = true;
          } else {
            throw directError;
          }
        }
      }

      // Parse the results
      const parsedResults = await this.parseResults(html, indexer, actualUrl);

      // Filter out results without titles
      const filteredResults = parsedResults.filter(result => {
        return result.title && result.title.trim().length > 0;
      });

      const result: ScraperResult = {
        success: true,
        data: filteredResults,
        html,
        usedFlaresolverr,
        url: actualUrl,
        statusCode,
      };

      // Cache the result (skip if skipCache option is set)
      if (this.cacheEnabled && query && !options.skipCache) {
        await this.cacheService.set(
          targetUrl,
          JSON.stringify(result),
          { query, indexerId: indexer.id }
        );
      }

      return result;
    } catch (error: any) {
      // Extract status code from HttpError if available
      const statusCode = error instanceof HttpError ? error.statusCode : 0;

      return {
        success: false,
        data: [],
        error: error.message,
        usedFlaresolverr,
        url: actualUrl,
        statusCode,
      };
    }
  }

  /**
   * Fetch page using direct HTTP request
   */
  private async fetchDirect(
    url: string,
    method: string,
    timeout?: number
  ): Promise<{ html: string; statusCode: number; url: string }> {
    const httpClient = new HttpClientService({ timeout });

    let response;
    if (method === 'POST') {
      response = await httpClient.post(url);
    } else {
      response = await httpClient.get(url);
    }

    if (response.status >= 400) {
      throw new HttpError(
        `HTTP ${response.status}: Failed to fetch ${url}`,
        response.status,
        url
      );
    }

    return {
      html: response.data,
      statusCode: response.status,
      url: response.url,
    };
  }

  /**
   * Fetch page using Flaresolverr
   */
  private async fetchWithFlaresolverr(
    url: string,
    method: string
  ): Promise<{ html: string; statusCode: number; url: string }> {
    const result = await this.flaresolverrService.solve(url, {
      method: method === 'POST' ? 'POST' : 'GET',
    });

    return {
      html: result.html,
      statusCode: result.status,
      url: result.url,
    };
  }

  /**
   * Build search URL from indexer config and query
   */
  private buildSearchUrl(indexer: IndexerConfig, query?: string): string | null {
    if (!indexer.searchUrl) {
      return null;
    }

    let url = indexer.searchUrl;

    // Parse existing query parameters
    const urlObj = new URL(url);

    // Add search query parameter if provided
    if (query && indexer.searchQueryParam) {
      urlObj.searchParams.set(indexer.searchQueryParam, query);
    }

    // Add additional search parameters from config
    if (indexer.searchParams && typeof indexer.searchParams === 'object') {
      const params = typeof indexer.searchParams === 'string'
        ? JSON.parse(indexer.searchParams)
        : indexer.searchParams;

      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string' || typeof value === 'number') {
          urlObj.searchParams.set(key, String(value));
        }
      }
    }

    return urlObj.toString();
  }

  /**
   * Build RSS URL from indexer config
   */
  private buildRssUrl(indexer: IndexerConfig): string | null {
    if (!indexer.rssUrl) {
      return null;
    }

    let url = indexer.rssUrl;
    const urlObj = new URL(url);

    // Add additional RSS parameters from config
    if (indexer.rssParams) {
      const params = typeof indexer.rssParams === 'string'
        ? JSON.parse(indexer.rssParams)
        : indexer.rssParams;

      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string' || typeof value === 'number') {
          urlObj.searchParams.set(key, String(value));
        }
      }
    }

    return urlObj.toString();
  }

  /**
   * Parse HTML results using indexer configuration
   */
  private async parseResults(html: string, indexer: IndexerConfig, baseUrl: string): Promise<ParsedResult[]> {
    if (!indexer.resultSelector) {
      return [];
    }

    try {
      // Determine mapping type (default to 'json' for backward compatibility)
      const mappingType = indexer.resultMappingType || 'json';

      if (mappingType === 'code') {
        // Use code-based extraction
        if (!indexer.resultMappingCode) {
          console.warn(`Indexer ${indexer.title} has code mapping type but no code provided`);
          return [];
        }

        return await this.parserService.extractDataWithCode(
          html,
          indexer.resultSelector,
          indexer.resultMappingCode,
          {
            baseUrl,
            normalizeWhitespace: true,
            trim: true,
          }
        );
      } else {
        // Use JSON-based extraction (existing logic)
        if (!indexer.resultMapping) {
          return [];
        }

        // Parse result mapping if it's a string
        const resultMapping = typeof indexer.resultMapping === 'string'
          ? JSON.parse(indexer.resultMapping)
          : indexer.resultMapping;

        // Extract data using parser service
        return this.parserService.extractData(
          html,
          indexer.resultSelector,
          resultMapping,
          {
            baseUrl,
            normalizeWhitespace: true,
            trim: true,
          }
        );
      }
    } catch (error: any) {
      console.error(`Failed to parse results for indexer ${indexer.title}:`, error);
      return [];
    }
  }

  /**
   * Test an indexer configuration
   */
  public async testIndexer(
    indexer: IndexerConfig,
    query?: string,
    options: ScraperOptions = {}
  ): Promise<{
    success: boolean;
    message: string;
    resultCount?: number;
    sampleResults?: ParsedResult[];
    html?: string;
    usedFlaresolverr?: boolean;
    statusCode?: number;
  }> {
    // Always skip cache for test requests to ensure fresh results
    const result = await this.scrape(indexer, query || undefined, { ...options, skipCache: true });

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Unknown error',
        usedFlaresolverr: result.usedFlaresolverr,
        statusCode: result.statusCode,
      };
    }

    return {
      success: true,
      message: `Successfully scraped ${result.data.length} results`,
      resultCount: result.data.length,
      sampleResults: result.data.slice(0, 5), // Return first 5 results as sample
      html: result.html,
      usedFlaresolverr: result.usedFlaresolverr,
      statusCode: result.statusCode,
    };
  }

  /**
   * Auto-detect search forms and RSS feeds on a page
   */
  public async autoDetect(url: string): Promise<{
    success: boolean;
    forms?: Array<any>;
    feeds?: Array<any>;
    error?: string;
  }> {
    try {
      // Fetch the page
      const response = await this.httpClient.get(url);

      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Extract forms and feeds
      const forms = this.parserService.extractForms(response.data);
      const feeds = this.parserService.extractFeedLinks(response.data, url);

      return {
        success: true,
        forms,
        feeds,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Auto-configure indexer by analyzing forms on the page
   */
  public async autoConfigureFromUrl(
    baseUrl: string,
    useFlaresolverr: boolean = false
  ): Promise<{
    success: boolean;
    config?: {
      searchUrl: string | null;
      searchMethod: string | null;
      searchQueryParam: string | null;
      searchParams: Record<string, string>;
      rssUrl: string | null;
    };
    error?: string;
    message?: string;
  }> {
    try {
      let html: string;

      // Fetch the page (with or without Flaresolverr)
      if (useFlaresolverr && (await this.flaresolverrService.isEnabled())) {
        try {
          const result = await this.flaresolverrService.solve(baseUrl, {
            method: 'GET',
          });
          html = result.html;
        } catch (flareError: any) {
          console.warn('Flaresolverr failed, falling back to direct request:', flareError.message);
          const response = await this.httpClient.get(baseUrl);
          html = response.data;
        }
      } else {
        const response = await this.httpClient.get(baseUrl);
        html = response.data;
      }

      // Extract forms and feeds from HTML
      const forms = this.parserService.extractForms(html);
      const feeds = this.parserService.extractFeedLinks(html, baseUrl);

      // Analyze forms to suggest configuration
      let searchUrl: string | null = null;
      let searchMethod: string | null = null;
      let searchQueryParam: string | null = null;
      let searchParams: Record<string, string> = {};
      let rssUrl: string | null = null;

      // Find the most likely search form
      if (forms && forms.length > 0) {
        const searchForm = this.findBestSearchForm(forms, baseUrl);

        if (searchForm) {
          // Build search URL
          const urlObj = new URL(baseUrl);
          if (searchForm.action) {
            try {
              searchUrl = new URL(searchForm.action, baseUrl).toString();
            } catch {
              searchUrl = baseUrl;
            }
          } else {
            searchUrl = baseUrl;
          }

          searchMethod = searchForm.method?.toUpperCase() || 'GET';

          // Find the query parameter (most likely text input field)
          const queryField = this.findQueryField(searchForm.fields);
          if (queryField) {
            searchQueryParam = queryField.name;
          }

          // Extract other parameters (non-query fields)
          searchForm.fields.forEach((field: any) => {
            if (field.name && field.name !== searchQueryParam) {
              // For hidden fields or fields with default values
              if (field.type === 'hidden' || field.value) {
                searchParams[field.name] = field.value || '';
              }
            }
          });
        }
      }

      // Find RSS feed
      if (feeds && feeds.length > 0) {
        rssUrl = feeds[0].url;
      }

      if (!searchUrl && !rssUrl) {
        return {
          success: false,
          error: 'No search forms or RSS feeds found on this page',
        };
      }

      return {
        success: true,
        config: {
          searchUrl,
          searchMethod,
          searchQueryParam,
          searchParams,
          rssUrl,
        },
        message: searchUrl
          ? `Found search form with ${forms?.length || 0} form(s)`
          : 'No search form found, but RSS feed detected',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Find the most likely search form from detected forms
   */
  private findBestSearchForm(forms: Array<any>, baseUrl: string): any {
    // Prioritize forms with search-related indicators
    const searchKeywords = ['search', 'query', 'q', 'find', 's'];

    // Score each form
    let bestForm = forms[0];
    let bestScore = 0;

    for (const form of forms) {
      let score = 0;

      // Check action URL for search keywords
      if (form.action) {
        const actionLower = form.action.toLowerCase();
        if (searchKeywords.some(keyword => actionLower.includes(keyword))) {
          score += 10;
        }
      }

      // Check if form has text input fields
      const textFields = form.fields.filter(
        (f: any) => f.type === 'text' || f.type === 'search'
      );
      score += textFields.length * 5;

      // Check field names for search keywords
      for (const field of form.fields) {
        if (field.name) {
          const nameLower = field.name.toLowerCase();
          if (searchKeywords.some(keyword => nameLower.includes(keyword))) {
            score += 15;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestForm = form;
      }
    }

    return bestScore > 0 ? bestForm : forms[0];
  }

  /**
   * Find the most likely query field from form fields
   */
  private findQueryField(fields: Array<any>): any {
    // Common query parameter names
    const commonQueryNames = ['q', 'query', 'search', 's', 'keyword', 'term', 'find'];

    // First, try exact matches
    for (const name of commonQueryNames) {
      const field = fields.find(
        (f: any) =>
          f.name?.toLowerCase() === name &&
          (f.type === 'text' || f.type === 'search' || !f.type)
      );
      if (field) return field;
    }

    // Then try partial matches
    for (const name of commonQueryNames) {
      const field = fields.find(
        (f: any) =>
          f.name?.toLowerCase().includes(name) &&
          (f.type === 'text' || f.type === 'search' || !f.type)
      );
      if (field) return field;
    }

    // Finally, return the first text input field
    return fields.find((f: any) => f.type === 'text' || f.type === 'search');
  }
}
