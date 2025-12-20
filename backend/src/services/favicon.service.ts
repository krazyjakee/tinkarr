import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Service for fetching and managing favicons
 */
export class FaviconService {
  /**
   * Fetch favicon for a given URL
   * Tries multiple methods:
   * 1. Look for <link rel="icon"> in HTML
   * 2. Try /favicon.ico
   * 3. Try /favicon.png
   * 4. Fallback to Google's favicon service
   */
  async fetchFavicon(url: string): Promise<string | null> {
    try {
      const baseUrl = new URL(url);
      const origin = baseUrl.origin;

      // Method 1: Parse HTML for favicon link
      const htmlFavicon = await this.fetchFaviconFromHtml(url);
      if (htmlFavicon) {
        return htmlFavicon;
      }

      // Method 2: Try standard favicon locations
      const standardPaths = ['/favicon.ico', '/favicon.png', '/favicon.svg'];
      for (const path of standardPaths) {
        try {
          const faviconUrl = `${origin}${path}`;
          const favicon = await this.downloadAndEncodeFavicon(faviconUrl);
          if (favicon) {
            return favicon;
          }
        } catch {
          // Continue to next path
          continue;
        }
      }

      // Method 3: Fallback to Google's favicon service
      return await this.fetchGoogleFavicon(origin);
    } catch (error) {
      console.error('Failed to fetch favicon:', error);
      return null;
    }
  }

  /**
   * Parse HTML to find favicon link
   */
  private async fetchFaviconFromHtml(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);

      // Look for various favicon link tags
      const iconSelectors = [
        'link[rel="icon"]',
        'link[rel="shortcut icon"]',
        'link[rel="apple-touch-icon"]',
      ];

      for (const selector of iconSelectors) {
        const href = $(selector).attr('href');
        if (href) {
          const faviconUrl = this.resolveUrl(href, url);
          const favicon = await this.downloadAndEncodeFavicon(faviconUrl);
          if (favicon) {
            return favicon;
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Download favicon and encode as base64 data URI
   */
  private async downloadAndEncodeFavicon(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      // Check if response is valid
      if (response.status !== 200 || !response.data) {
        return null;
      }

      // Determine MIME type from content-type header or URL extension
      let mimeType = response.headers['content-type'];
      if (!mimeType) {
        if (url.endsWith('.png')) mimeType = 'image/png';
        else if (url.endsWith('.svg')) mimeType = 'image/svg+xml';
        else if (url.endsWith('.jpg') || url.endsWith('.jpeg'))
          mimeType = 'image/jpeg';
        else mimeType = 'image/x-icon'; // Default to .ico
      }

      // Convert to base64
      const base64 = Buffer.from(response.data).toString('base64');
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      return null;
    }
  }

  /**
   * Use Google's favicon service as fallback
   */
  private async fetchGoogleFavicon(domain: string): Promise<string | null> {
    try {
      const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      return await this.downloadAndEncodeFavicon(googleUrl);
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolve relative URL to absolute
   */
  private resolveUrl(href: string, baseUrl: string): string {
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href;
    }

    const base = new URL(baseUrl);
    if (href.startsWith('//')) {
      return `${base.protocol}${href}`;
    }
    if (href.startsWith('/')) {
      return `${base.origin}${href}`;
    }
    return `${base.origin}/${href}`;
  }
}
