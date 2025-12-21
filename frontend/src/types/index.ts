export interface User {
  id: number;
  username: string;
  apiKey: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Indexer {
  id: number;
  title: string;
  url: string;
  favicon?: string;
  requiresFlaresolverr: boolean;
  enabled: boolean;
  searchType?: 'html_form' | 'rest_api' | 'none';
  searchUrl?: string;
  searchMethod?: 'GET' | 'POST';
  searchParams?: Record<string, string>;
  searchQueryParam?: string;
  rssUrl?: string;
  rssType?: 'rest_api' | 'static' | 'none';
  rssParams?: Record<string, string>;
  rssUrlGeneratorCode?: string;
  rssMethod?: 'GET' | 'POST';
  resultSelector?: string;
  resultMapping?: Record<string, string>;
  resultMappingType?: 'json' | 'code';
  resultMappingCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIndexerRequest {
  title: string;
  url: string;
  favicon?: string;
  requiresFlaresolverr?: boolean;
  enabled?: boolean;
  searchType?: 'html_form' | 'rest_api' | 'none';
  searchUrl?: string;
  searchMethod?: 'GET' | 'POST';
  searchParams?: Record<string, string>;
  searchQueryParam?: string;
  rssUrl?: string;
  rssType?: 'rest_api' | 'static' | 'none';
  rssParams?: Record<string, string>;
  rssUrlGeneratorCode?: string;
  rssMethod?: 'GET' | 'POST';
  resultSelector?: string;
  resultMapping?: Record<string, string>;
  resultMappingType?: 'json' | 'code';
  resultMappingCode?: string;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface TestIndexerRequest {
  query?: string;
  useFlaresolverr?: boolean;
  // RSS Context parameters for testing typical Sonarr/Radarr requests
  season?: number;
  episode?: number;
  imdbId?: string;
  tvdbId?: string;
  categories?: string[];
}

export interface TestIndexerResponse {
  success: boolean;
  message: string;
  resultCount: number;
  sampleResults: Array<{
    title?: string;
    link?: string;
    size?: string;
    seeders?: string;
    leechers?: string;
    category?: string;
    pubDate?: string;
  }>;
  html?: string;
  usedFlaresolverr: boolean;
  statusCode: number;
  // New fields for RSS testing
  targetUrl?: string;
  usedRss?: boolean;
  rssParams?: Record<string, string>;
}

export interface PreviewIndexerRequest {
  query?: string;
  // RSS Context parameters for testing typical Sonarr/Radarr requests
  season?: number;
  episode?: number;
  imdbId?: string;
  tvdbId?: string;
  categories?: string[];
}

export interface PreviewIndexerResponse {
  success: boolean;
  message: string;
  targetUrl: string;
  method: string;
  usedRss: boolean;
  rssParams?: Record<string, string>;
  searchParams?: Record<string, string>;
}

export interface AutoDetectResponse {
  success: boolean;
  forms: Array<{
    action: string;
    method: string;
    fields: Array<{
      name: string;
      type: string;
    }>;
  }>;
  feeds: Array<{
    url: string;
    type: string;
    title?: string;
  }>;
}

export interface FlaresolverrTestResponse {
  success: boolean;
  message: string;
  version?: string;
}

