import { ParserService } from '../services/parser.service';

describe('ParserService', () => {
  let parser: ParserService;

  beforeEach(() => {
    parser = new ParserService();
  });

  describe('parseHtml', () => {
    it('should parse valid HTML', () => {
      const html = '<html><body><h1>Test</h1></body></html>';
      const $ = parser.parseHtml(html);
      expect($('h1').text()).toBe('Test');
    });

    it('should handle malformed HTML', () => {
      const html = '<div><p>Test<div>Nested</p></div>';
      const $ = parser.parseHtml(html);
      expect($).toBeDefined();
    });
  });

  describe('extractData', () => {
    it('should extract data from multiple items', () => {
      const html = `
        <div class="results">
          <div class="result">
            <h2 class="title">Item 1</h2>
            <a class="link" href="/download/1">Download</a>
            <span class="size">1.5 GB</span>
          </div>
          <div class="result">
            <h2 class="title">Item 2</h2>
            <a class="link" href="/download/2">Download</a>
            <span class="size">2.5 GB</span>
          </div>
        </div>
      `;

      const results = parser.extractData(html, '.result', {
        title: '.title',
        link: '.link@href',
        size: '.size',
      });

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Item 1');
      expect(results[0].link).toBe('/download/1');
      expect(results[0].size).toBe('1.5 GB');
      expect(results[1].title).toBe('Item 2');
    });

    it('should resolve relative URLs with baseUrl', () => {
      const html = '<div class="result"><a href="/download/1">Link</a></div>';
      const results = parser.extractData(
        html,
        '.result',
        { link: 'a@href' },
        { baseUrl: 'https://example.com' }
      );

      expect(results[0].link).toBe('https://example.com/download/1');
    });

    it('should normalize whitespace', () => {
      const html = '<div class="result"><p class="title">  Multiple   Spaces  </p></div>';
      const results = parser.extractData(html, '.result', { title: '.title' });

      expect(results[0].title).toBe('Multiple Spaces');
    });

    it('should handle missing elements', () => {
      const html = '<div class="result"><h2 class="title">Title</h2></div>';
      const results = parser.extractData(html, '.result', {
        title: '.title',
        missingField: '.does-not-exist',
      });

      expect(results[0].title).toBe('Title');
      expect(results[0].missingField).toBeNull();
    });

    it('should return empty array when selector matches nothing', () => {
      const html = '<div><p>No results</p></div>';
      const results = parser.extractData(html, '.result', { title: '.title' });

      expect(results).toEqual([]);
    });

    it('should extract nested attributes', () => {
      const html = '<div class="result"><img src="/image.png" alt="Test" /></div>';
      const results = parser.extractData(html, '.result', {
        image: 'img@src',
        alt: 'img@alt',
      });

      expect(results[0].image).toBe('/image.png');
      expect(results[0].alt).toBe('Test');
    });
  });

  describe('extractLinks', () => {
    it('should extract all links from HTML', () => {
      const html = `
        <div>
          <a href="/page1">Page 1</a>
          <a href="/page2">Page 2</a>
          <a href="https://external.com">External</a>
        </div>
      `;

      const links = parser.extractLinks(html);

      expect(links).toHaveLength(3);
      expect(links).toContain('/page1');
      expect(links).toContain('/page2');
      expect(links).toContain('https://external.com');
    });

    it('should resolve relative links with baseUrl', () => {
      const html = '<a href="/page">Page</a>';
      const links = parser.extractLinks(html, 'https://example.com');

      expect(links).toEqual(['https://example.com/page']);
    });
  });

  describe('extractImages', () => {
    it('should extract all image sources', () => {
      const html = `
        <div>
          <img src="/image1.png" />
          <img src="/image2.jpg" />
          <img src="https://external.com/image3.gif" />
        </div>
      `;

      const images = parser.extractImages(html);

      expect(images).toHaveLength(3);
      expect(images).toContain('/image1.png');
      expect(images).toContain('/image2.jpg');
      expect(images).toContain('https://external.com/image3.gif');
    });

    it('should resolve relative image paths with baseUrl', () => {
      const html = '<img src="/image.png" />';
      const images = parser.extractImages(html, 'https://example.com');

      expect(images).toEqual(['https://example.com/image.png']);
    });
  });

  describe('extractForms', () => {
    it('should extract form details', () => {
      const html = `
        <form action="/search" method="POST">
          <input type="text" name="query" />
          <input type="hidden" name="token" value="abc123" />
          <select name="category">
            <option value="all">All</option>
          </select>
          <button type="submit">Search</button>
        </form>
      `;

      const forms = parser.extractForms(html);

      expect(forms).toHaveLength(1);
      expect(forms[0].action).toBe('/search');
      expect(forms[0].method).toBe('POST');
      expect(forms[0].fields).toHaveLength(3);
      expect(forms[0].fields[0]).toEqual({ name: 'query', type: 'text', value: undefined });
      expect(forms[0].fields[1]).toEqual({ name: 'token', type: 'hidden', value: 'abc123' });
    });

    it('should default to GET method if not specified', () => {
      const html = '<form action="/search"><input name="q" /></form>';
      const forms = parser.extractForms(html);

      expect(forms[0].method).toBe('GET');
    });

    it('should handle multiple forms', () => {
      const html = `
        <form action="/search1"><input name="q1" /></form>
        <form action="/search2"><input name="q2" /></form>
      `;
      const forms = parser.extractForms(html);

      expect(forms).toHaveLength(2);
    });
  });

  describe('extractFeedLinks', () => {
    it('should extract RSS feed links from link tags', () => {
      const html = `
        <head>
          <link rel="alternate" type="application/rss+xml" href="/rss.xml" title="RSS Feed" />
          <link rel="alternate" type="application/atom+xml" href="/atom.xml" title="Atom Feed" />
        </head>
      `;

      const feeds = parser.extractFeedLinks(html);

      expect(feeds.length).toBeGreaterThanOrEqual(2);
      const rssFeed = feeds.find(f => f.type === 'application/rss+xml' && f.url === '/rss.xml');
      const atomFeed = feeds.find(f => f.type === 'application/atom+xml' && f.url === '/atom.xml');

      expect(rssFeed).toBeDefined();
      expect(rssFeed?.title).toBe('RSS Feed');
      expect(atomFeed).toBeDefined();
    });

    it('should extract common feed URLs from links', () => {
      const html = '<a href="/feed">Subscribe to Feed</a>';
      const feeds = parser.extractFeedLinks(html);

      expect(feeds.length).toBeGreaterThan(0);
      const feedLink = feeds.find(f => f.url === '/feed');
      expect(feedLink).toBeDefined();
    });

    it('should resolve relative feed URLs with baseUrl', () => {
      const html = '<link rel="alternate" type="application/rss+xml" href="/rss.xml" />';
      const feeds = parser.extractFeedLinks(html, 'https://example.com');

      expect(feeds[0].url).toBe('https://example.com/rss.xml');
    });
  });

  describe('extractText', () => {
    it('should extract text from element', () => {
      const html = '<div><h1 class="title">Hello World</h1></div>';
      const text = parser.extractText(html, '.title');

      expect(text).toBe('Hello World');
    });

    it('should return null if element not found', () => {
      const html = '<div><p>Text</p></div>';
      const text = parser.extractText(html, '.missing');

      expect(text).toBeNull();
    });

    it('should normalize whitespace by default', () => {
      const html = '<div class="text">  Multiple   Spaces  </div>';
      const text = parser.extractText(html, '.text');

      expect(text).toBe('Multiple Spaces');
    });
  });

  describe('extractAttribute', () => {
    it('should extract attribute value', () => {
      const html = '<a href="/page" class="link" data-id="123">Link</a>';
      const href = parser.extractAttribute(html, 'a.link', 'href');
      const dataId = parser.extractAttribute(html, 'a.link', 'data-id');

      expect(href).toBe('/page');
      expect(dataId).toBe('123');
    });

    it('should resolve relative URLs for href/src attributes', () => {
      const html = '<a href="/page">Link</a>';
      const href = parser.extractAttribute(html, 'a', 'href', {
        baseUrl: 'https://example.com',
      });

      expect(href).toBe('https://example.com/page');
    });

    it('should return null if element not found', () => {
      const html = '<div><p>Text</p></div>';
      const attr = parser.extractAttribute(html, '.missing', 'href');

      expect(attr).toBeNull();
    });
  });

  describe('countElements', () => {
    it('should count matching elements', () => {
      const html = `
        <div>
          <p class="item">1</p>
          <p class="item">2</p>
          <p class="item">3</p>
        </div>
      `;

      const count = parser.countElements(html, '.item');
      expect(count).toBe(3);
    });

    it('should return 0 if no elements match', () => {
      const html = '<div><p>Text</p></div>';
      const count = parser.countElements(html, '.missing');

      expect(count).toBe(0);
    });
  });

  describe('elementExists', () => {
    it('should return true if element exists', () => {
      const html = '<div class="exists">Content</div>';
      expect(parser.elementExists(html, '.exists')).toBe(true);
    });

    it('should return false if element does not exist', () => {
      const html = '<div>Content</div>';
      expect(parser.elementExists(html, '.missing')).toBe(false);
    });
  });

  describe('URL resolution', () => {
    it('should handle protocol-relative URLs', () => {
      const html = '<a href="//example.com/path">Link</a>';
      const links = parser.extractLinks(html, 'https://base.com');

      expect(links[0]).toBe('https://example.com/path');
    });

    it('should handle absolute paths', () => {
      const html = '<a href="/absolute/path">Link</a>';
      const links = parser.extractLinks(html, 'https://example.com/some/page');

      expect(links[0]).toBe('https://example.com/absolute/path');
    });

    it('should handle relative paths', () => {
      const html = '<a href="relative/path">Link</a>';
      const links = parser.extractLinks(html, 'https://example.com/base/');

      expect(links[0]).toBe('https://example.com/base/relative/path');
    });

    it('should not modify absolute URLs', () => {
      const html = '<a href="https://external.com/page">Link</a>';
      const links = parser.extractLinks(html, 'https://example.com');

      expect(links[0]).toBe('https://external.com/page');
    });
  });
});
