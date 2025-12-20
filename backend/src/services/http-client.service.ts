import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

export interface HttpClientOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  userAgent?: string;
  followRedirects?: boolean;
  maxRedirects?: number;
  cookies?: boolean;
}

export interface HttpResponse {
  data: string;
  status: number;
  headers: Record<string, string>;
  url: string;
}

const DEFAULT_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
];

export class HttpClientService {
  private axiosInstance: AxiosInstance;
  private cookieJar?: CookieJar;
  private options: Required<HttpClientOptions>;
  private userAgentIndex: number = 0;

  constructor(options: HttpClientOptions = {}) {
    this.options = {
      timeout: options.timeout ?? 30000,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      userAgent: options.userAgent ?? this.getRandomUserAgent(),
      followRedirects: options.followRedirects ?? true,
      maxRedirects: options.maxRedirects ?? 5,
      cookies: options.cookies ?? true,
    };

    // Create cookie jar if cookies are enabled
    if (this.options.cookies) {
      this.cookieJar = new CookieJar();
      this.axiosInstance = wrapper(
        axios.create({
          jar: this.cookieJar,
          withCredentials: true,
        })
      );
    } else {
      this.axiosInstance = axios.create();
    }

    // Configure axios defaults
    this.axiosInstance.defaults.timeout = this.options.timeout;
    this.axiosInstance.defaults.maxRedirects = this.options.maxRedirects;
    this.axiosInstance.defaults.headers.common['User-Agent'] = this.options.userAgent;
    this.axiosInstance.defaults.validateStatus = (status) => status < 500; // Don't throw on 4xx errors
  }

  /**
   * Get a random user agent from the list
   */
  private getRandomUserAgent(): string {
    return DEFAULT_USER_AGENTS[Math.floor(Math.random() * DEFAULT_USER_AGENTS.length)];
  }

  /**
   * Rotate to the next user agent in the list
   */
  public rotateUserAgent(): void {
    this.userAgentIndex = (this.userAgentIndex + 1) % DEFAULT_USER_AGENTS.length;
    const newUserAgent = DEFAULT_USER_AGENTS[this.userAgentIndex];
    this.axiosInstance.defaults.headers.common['User-Agent'] = newUserAgent;
    this.options.userAgent = newUserAgent;
  }

  /**
   * Perform HTTP GET request with retry logic
   */
  public async get(url: string, config: AxiosRequestConfig = {}): Promise<HttpResponse> {
    return this.requestWithRetry('GET', url, config);
  }

  /**
   * Perform HTTP POST request with retry logic
   */
  public async post(url: string, data?: any, config: AxiosRequestConfig = {}): Promise<HttpResponse> {
    return this.requestWithRetry('POST', url, { ...config, data });
  }

  /**
   * Perform HTTP request with retry logic
   */
  private async requestWithRetry(
    method: string,
    url: string,
    config: AxiosRequestConfig,
    retryCount: number = 0
  ): Promise<HttpResponse> {
    try {
      const response = await this.axiosInstance.request({
        method,
        url,
        ...config,
      });

      return this.transformResponse(response);
    } catch (error: any) {
      // Check if we should retry
      if (retryCount < this.options.maxRetries && this.shouldRetry(error)) {
        // Calculate delay with exponential backoff
        const delay = this.options.retryDelay * Math.pow(2, retryCount);

        console.log(`Request failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.options.maxRetries})`);

        await this.sleep(delay);

        // Rotate user agent on retry
        if (retryCount > 0) {
          this.rotateUserAgent();
        }

        return this.requestWithRetry(method, url, config, retryCount + 1);
      }

      // Max retries reached or non-retryable error
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: any): boolean {
    // Retry on network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }

    // Retry on 5xx server errors
    if (error.response && error.response.status >= 500) {
      return true;
    }

    // Retry on rate limiting (429)
    if (error.response && error.response.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Transform axios response to our standardized format
   */
  private transformResponse(response: AxiosResponse): HttpResponse {
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
      url: response.config.url || '',
    };
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear all cookies in the jar
   */
  public clearCookies(): void {
    if (this.cookieJar) {
      this.cookieJar.removeAllCookiesSync();
    }
  }

  /**
   * Get current user agent
   */
  public getUserAgent(): string {
    return this.options.userAgent;
  }

  /**
   * Set custom user agent
   */
  public setUserAgent(userAgent: string): void {
    this.options.userAgent = userAgent;
    this.axiosInstance.defaults.headers.common['User-Agent'] = userAgent;
  }

  /**
   * Get timeout value
   */
  public getTimeout(): number {
    return this.options.timeout;
  }

  /**
   * Set timeout value
   */
  public setTimeout(timeout: number): void {
    this.options.timeout = timeout;
    this.axiosInstance.defaults.timeout = timeout;
  }
}

// Export a default instance
export const httpClient = new HttpClientService();
