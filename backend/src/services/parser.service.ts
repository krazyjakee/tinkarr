import * as cheerio from 'cheerio';
import { CheerioAPI } from 'cheerio';
import { CodeExecutorService, ElementContext } from './code-executor.service';

export interface ParsedResult {
  [key: string]: string | null;
}

export interface ParserOptions {
  baseUrl?: string;
  normalizeWhitespace?: boolean;
  trim?: boolean;
}

export class ParserService {
  /**
   * Parse HTML string into Cheerio instance
   */
  public parseHtml(html: string): CheerioAPI {
    return cheerio.load(html, {
      xml: {
        xmlMode: false,
      },
    });
  }

  /**
   * Extract data from HTML using CSS selectors and mapping
   */
  public extractData(
    html: string,
    itemSelector: string,
    fieldMapping: Record<string, string>,
    options: ParserOptions = {}
  ): ParsedResult[] {
    const $ = this.parseHtml(html);
    const results: ParsedResult[] = [];

    // Find all items matching the selector
    const items = $(itemSelector);

    if (items.length === 0) {
      console.warn(`No items found with selector: ${itemSelector}`);
      return [];
    }

    // Extract data from each item
    items.each((_index, element) => {
      const item: ParsedResult = {};

      // Apply each field mapping
      for (const [fieldName, selector] of Object.entries(fieldMapping)) {
        try {
          const value = this.extractField($(element), selector, options);
          item[fieldName] = value;
        } catch (error: any) {
          console.warn(`Failed to extract field '${fieldName}' with selector '${selector}': ${error.message}`);
          item[fieldName] = null;
        }
      }

      results.push(item);
    });

    return results;
  }

  /**
   * Extract a single field from an element using a selector
   * Supports special syntax for attributes: selector@attribute
   */
  private extractField(
    $element: cheerio.Cheerio<any>,
    selector: string,
    options: ParserOptions
  ): string | null {
    // Check if selector includes attribute extraction (e.g., "a@href")
    const attributeMatch = selector.match(/^(.+)@([a-zA-Z-]+)$/);

    if (attributeMatch) {
      const [, cssSelector, attribute] = attributeMatch;
      const element = cssSelector.trim() ? $element.find(cssSelector.trim()) : $element;

      if (element.length === 0) {
        return null;
      }

      let value = element.attr(attribute) || null;

      // Handle relative URLs for href and src attributes
      if (value && (attribute === 'href' || attribute === 'src') && options.baseUrl) {
        value = this.resolveUrl(value, options.baseUrl);
      }

      return value;
    } else {
      // Extract text content
      const element = selector.trim() ? $element.find(selector.trim()) : $element;

      if (element.length === 0) {
        return null;
      }

      let text = element.text();

      // Normalize whitespace
      if (options.normalizeWhitespace !== false) {
        text = this.normalizeWhitespace(text);
      }

      // Trim whitespace
      if (options.trim !== false) {
        text = text.trim();
      }

      return text || null;
    }
  }

  /**
   * Normalize whitespace in text
   */
  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n')  // Remove empty lines
      .trim();
  }

  /**
   * Resolve relative URL to absolute URL
   */
  private resolveUrl(url: string, baseUrl: string): string {
    try {
      // If URL is already absolute, return it
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      // Create absolute URL
      const base = new URL(baseUrl);

      // Handle protocol-relative URLs (//example.com/path)
      if (url.startsWith('//')) {
        return `${base.protocol}${url}`;
      }

      // Handle absolute paths (/path)
      if (url.startsWith('/')) {
        return `${base.protocol}//${base.host}${url}`;
      }

      // Handle relative paths (path or ./path)
      return new URL(url, baseUrl).href;
    } catch (error) {
      console.warn(`Failed to resolve URL '${url}' with base '${baseUrl}'`);
      return url;
    }
  }

  /**
   * Extract all links from HTML
   */
  public extractLinks(html: string, baseUrl?: string): string[] {
    const $ = this.parseHtml(html);
    const links: string[] = [];

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        const resolvedUrl = baseUrl ? this.resolveUrl(href, baseUrl) : href;
        links.push(resolvedUrl);
      }
    });

    return links;
  }

  /**
   * Extract all images from HTML
   */
  public extractImages(html: string, baseUrl?: string): string[] {
    const $ = this.parseHtml(html);
    const images: string[] = [];

    $('img[src]').each((_, element) => {
      const src = $(element).attr('src');
      if (src) {
        const resolvedUrl = baseUrl ? this.resolveUrl(src, baseUrl) : src;
        images.push(resolvedUrl);
      }
    });

    return images;
  }

  /**
   * Find all forms on the page
   */
  public extractForms(html: string): Array<{
    action: string | null;
    method: string;
    fields: Array<{ name: string; type: string; value?: string }>;
  }> {
    const $ = this.parseHtml(html);
    const forms: Array<any> = [];

    $('form').each((_, formElement) => {
      const $form = $(formElement);
      const action = $form.attr('action') || null;
      const method = ($form.attr('method') || 'GET').toUpperCase();
      const fields: Array<any> = [];

      // Extract input fields
      $form.find('input, select, textarea').each((_, fieldElement) => {
        const $field = $(fieldElement);
        const name = $field.attr('name');
        const tagName = $field.prop('tagName');
        const type = $field.attr('type') || (typeof tagName === 'string' ? tagName.toLowerCase() : 'text');
        const value = $field.attr('value');

        if (name) {
          fields.push({
            name,
            type,
            value,
          });
        }
      });

      forms.push({
        action,
        method,
        fields,
      });
    });

    return forms;
  }

  /**
   * Find RSS/Atom feed links
   */
  public extractFeedLinks(html: string, baseUrl?: string): Array<{
    url: string;
    type: string;
    title?: string;
  }> {
    const $ = this.parseHtml(html);
    const feeds: Array<any> = [];

    // Look for feed link tags
    $('link[type="application/rss+xml"], link[type="application/atom+xml"]').each((_, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const type = $link.attr('type');
      const title = $link.attr('title');

      if (href && type) {
        const resolvedUrl = baseUrl ? this.resolveUrl(href, baseUrl) : href;
        feeds.push({
          url: resolvedUrl,
          type,
          title,
        });
      }
    });

    // Also look for common feed URLs
    const commonFeedPaths = ['/rss', '/feed', '/atom', '/rss.xml', '/feed.xml', '/atom.xml'];
    for (const path of commonFeedPaths) {
      $(`a[href*="${path}"]`).each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          const resolvedUrl = baseUrl ? this.resolveUrl(href, baseUrl) : href;
          if (!feeds.some(f => f.url === resolvedUrl)) {
            feeds.push({
              url: resolvedUrl,
              type: 'application/rss+xml',
              title: $(element).text().trim(),
            });
          }
        }
      });
    }

    return feeds;
  }

  /**
   * Extract text content from element
   */
  public extractText(html: string, selector: string, options: ParserOptions = {}): string | null {
    const $ = this.parseHtml(html);
    const element = $(selector);

    if (element.length === 0) {
      return null;
    }

    let text = element.text();

    if (options.normalizeWhitespace !== false) {
      text = this.normalizeWhitespace(text);
    }

    if (options.trim !== false) {
      text = text.trim();
    }

    return text || null;
  }

  /**
   * Extract attribute value from element
   */
  public extractAttribute(html: string, selector: string, attribute: string, options: ParserOptions = {}): string | null {
    const $ = this.parseHtml(html);
    const element = $(selector);

    if (element.length === 0) {
      return null;
    }

    let value = element.attr(attribute) || null;

    // Handle relative URLs
    if (value && (attribute === 'href' || attribute === 'src') && options.baseUrl) {
      value = this.resolveUrl(value, options.baseUrl);
    }

    return value;
  }

  /**
   * Count elements matching a selector
   */
  public countElements(html: string, selector: string): number {
    const $ = this.parseHtml(html);
    return $(selector).length;
  }

  /**
   * Check if element exists
   */
  public elementExists(html: string, selector: string): boolean {
    return this.countElements(html, selector) > 0;
  }

  /**
   * Extract data using JavaScript code execution
   */
  public async extractDataWithCode(
    html: string,
    itemSelector: string,
    code: string,
    options: ParserOptions = {}
  ): Promise<ParsedResult[]> {
    const $ = this.parseHtml(html);
    const items = $(itemSelector);

    if (items.length === 0) {
      console.warn(`No items found with selector: ${itemSelector}`);
      return [];
    }

    // Prepare element data for code execution
    const elementData: ElementContext[] = [];

    items.each((_index, element) => {
      const $el = $(element);

      // Create find helper function
      const findHelper = (selector: string) => {
        const found = $el.find(selector);
        if (found.length === 0) return null;

        return {
          text: found.text().trim(),
          attr: (name: string) => {
            const value = found.attr(name) || null;
            // Resolve URLs if needed
            if (value && (name === 'href' || name === 'src') && options.baseUrl) {
              return this.resolveUrl(value, options.baseUrl);
            }
            return value;
          },
        };
      };

      elementData.push({
        text: $el.text().trim(),
        html: $el.html() || '',
        attrs: (element as any).attribs || {},
        find: findHelper,
      });
    });

    // Execute user code
    const codeExecutor = new CodeExecutorService();
    try {
      const results = await codeExecutor.executeUserCode(
        code,
        {
          items: elementData,
          baseUrl: options.baseUrl || '',
        }
      );

      return results;
    } catch (error: any) {
      console.error(`Code execution failed: ${error.message}`);
      throw error;
    }
  }
}

// Export a default instance
export const parserService = new ParserService();
