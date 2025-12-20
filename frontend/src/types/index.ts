export interface User {
  id: number;
  username: string;
  apiKey: string;
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
  resultSelector?: string;
  resultMapping?: Record<string, string>;
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
  resultSelector?: string;
  resultMapping?: Record<string, string>;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface TestIndexerRequest {
  query: string;
  useFlaresolverr?: boolean;
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

export interface AutoConfigureResponse {
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
}
