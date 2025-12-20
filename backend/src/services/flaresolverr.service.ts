import axios, { AxiosInstance } from 'axios';
import { SettingsService } from './settings.service';

export interface FlaresolverrRequest {
  cmd: string;
  url: string;
  maxTimeout?: number;
  cookies?: Array<{ name: string; value: string }>;
  returnOnlyCookies?: boolean;
  proxy?: {
    url: string;
    username?: string;
    password?: string;
  };
}

export interface FlaresolverrResponse {
  status: string;
  message: string;
  solution: {
    url: string;
    status: number;
    headers: Record<string, string>;
    response: string;
    cookies: Array<{ name: string; value: string; domain: string }>;
    userAgent: string;
  };
  startTimestamp: number;
  endTimestamp: number;
  version: string;
}

export class FlaresolverrService {
  private axiosInstance: AxiosInstance;
  private settingsService: SettingsService;
  private flaresolverrUrl: string | null = null;
  private enabled: boolean = false;

  constructor(settingsService: SettingsService) {
    this.settingsService = settingsService;
    this.axiosInstance = axios.create({
      timeout: 60000, // Flaresolverr can take a while
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Initialize settings
    this.loadSettings();
  }

  /**
   * Load Flaresolverr settings from database
   */
  private async loadSettings(): Promise<void> {
    try {
      const urlSetting = await this.settingsService.get('flaresolverr_url');
      const enabledSetting = await this.settingsService.get('flaresolverr_enabled');

      this.flaresolverrUrl = urlSetting || null;
      this.enabled = enabledSetting === 'true' || enabledSetting === '1';
    } catch (error) {
      console.error('Failed to load Flaresolverr settings:', error);
      this.enabled = false;
    }
  }

  /**
   * Check if Flaresolverr is enabled and configured
   */
  public async isEnabled(): Promise<boolean> {
    await this.loadSettings();
    return this.enabled && this.flaresolverrUrl !== null;
  }

  /**
   * Get the configured Flaresolverr URL
   */
  public async getUrl(): Promise<string | null> {
    await this.loadSettings();
    return this.flaresolverrUrl;
  }

  /**
   * Test connection to Flaresolverr
   */
  public async testConnection(urlOverride?: string): Promise<{ success: boolean; message: string; version?: string }> {
    await this.loadSettings();

    const testUrl = urlOverride || this.flaresolverrUrl;

    if (!testUrl) {
      return {
        success: false,
        message: 'Flaresolverr URL is not configured',
      };
    }

    try {
      const response = await this.axiosInstance.post<FlaresolverrResponse>(testUrl, {
        cmd: 'request.get',
        url: 'https://www.google.com',
        maxTimeout: 15000,
      });

      if (response.data.status === 'ok') {
        return {
          success: true,
          message: 'Successfully connected to Flaresolverr',
          version: response.data.version,
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Unknown error',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to connect: ${error.message}`,
      };
    }
  }

  /**
   * Solve a URL using Flaresolverr
   */
  public async solve(url: string, options: {
    method?: 'GET' | 'POST';
    postData?: string;
    maxTimeout?: number;
    cookies?: Array<{ name: string; value: string }>;
  } = {}): Promise<{
    html: string;
    status: number;
    headers: Record<string, string>;
    cookies: Array<{ name: string; value: string; domain: string }>;
    url: string;
  }> {
    await this.loadSettings();

    if (!this.enabled || !this.flaresolverrUrl) {
      throw new Error('Flaresolverr is not enabled or configured');
    }

    const method = options.method || 'GET';
    const cmd = method === 'POST' ? 'request.post' : 'request.get';

    const requestData: any = {
      cmd,
      url,
      maxTimeout: options.maxTimeout || 60000,
    };

    if (options.cookies && options.cookies.length > 0) {
      requestData.cookies = options.cookies;
    }

    if (method === 'POST' && options.postData) {
      requestData.postData = options.postData;
    }

    try {
      const response = await this.axiosInstance.post<FlaresolverrResponse>(
        this.flaresolverrUrl,
        requestData
      );

      if (response.data.status !== 'ok') {
        throw new Error(response.data.message || 'Flaresolverr returned an error');
      }

      const solution = response.data.solution;

      return {
        html: solution.response,
        status: solution.status,
        headers: solution.headers,
        cookies: solution.cookies,
        url: solution.url,
      };
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Flaresolverr error: ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Failed to connect to Flaresolverr. Is it running?');
      } else {
        throw new Error(`Flaresolverr error: ${error.message}`);
      }
    }
  }

  /**
   * Create a new session in Flaresolverr
   */
  public async createSession(sessionId?: string): Promise<string> {
    await this.loadSettings();

    if (!this.enabled || !this.flaresolverrUrl) {
      throw new Error('Flaresolverr is not enabled or configured');
    }

    try {
      const response = await this.axiosInstance.post<any>(this.flaresolverrUrl, {
        cmd: 'sessions.create',
        session: sessionId || `session_${Date.now()}`,
      });

      if (response.data.status === 'ok') {
        return response.data.session;
      } else {
        throw new Error(response.data.message || 'Failed to create session');
      }
    } catch (error: any) {
      throw new Error(`Failed to create Flaresolverr session: ${error.message}`);
    }
  }

  /**
   * Destroy a session in Flaresolverr
   */
  public async destroySession(sessionId: string): Promise<void> {
    await this.loadSettings();

    if (!this.enabled || !this.flaresolverrUrl) {
      throw new Error('Flaresolverr is not enabled or configured');
    }

    try {
      await this.axiosInstance.post(this.flaresolverrUrl, {
        cmd: 'sessions.destroy',
        session: sessionId,
      });
    } catch (error: any) {
      console.error(`Failed to destroy Flaresolverr session: ${error.message}`);
    }
  }

  /**
   * Set Flaresolverr URL
   */
  public async setUrl(url: string): Promise<void> {
    await this.settingsService.set('flaresolverr_url', url);
    this.flaresolverrUrl = url;
  }

  /**
   * Enable or disable Flaresolverr
   */
  public async setEnabled(enabled: boolean): Promise<void> {
    await this.settingsService.set('flaresolverr_enabled', enabled ? 'true' : 'false');
    this.enabled = enabled;
  }
}
