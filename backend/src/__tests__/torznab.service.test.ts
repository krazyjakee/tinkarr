import { TorznabService, TORZNAB_CATEGORIES } from '../services/torznab.service';
import { ParsedResult } from '../services/parser.service';

describe('TorznabService', () => {
  let torznabService: TorznabService;

  beforeEach(() => {
    torznabService = new TorznabService();
  });

  describe('generateCapsXml', () => {
    it('should generate valid capabilities XML', () => {
      const xml = torznabService.generateCapsXml('Test Indexer');

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<caps>');
      expect(xml).toContain('<server version="1.0" title="Test Indexer"');
      expect(xml).toContain('<searching>');
      expect(xml).toContain('<search available="yes"');
      expect(xml).toContain('<tv-search available="yes"');
      expect(xml).toContain('<movie-search available="yes"');
      expect(xml).toContain('<categories>');
      expect(xml).toContain('</caps>');
    });

    it('should escape special characters in indexer title', () => {
      const xml = torznabService.generateCapsXml('Test & "Indexer" <Special>');

      expect(xml).toContain('Test &amp; &quot;Indexer&quot; &lt;Special&gt;');
    });
  });

  describe('generateRssXml', () => {
    it('should generate valid RSS XML with items', () => {
      const items = [
        {
          title: 'Test Item 1',
          guid: 'item-1',
          link: 'http://example.com/download/1',
          pubDate: new Date('2024-01-01'),
          size: 1024 * 1024 * 1024, // 1 GB
          category: TORZNAB_CATEGORIES.MOVIES_HD,
          seeders: 10,
          peers: 5,
        },
        {
          title: 'Test Item 2',
          guid: 'item-2',
          link: 'http://example.com/download/2',
          pubDate: new Date('2024-01-02'),
        },
      ];

      const xml = torznabService.generateRssXml('Test Indexer', items);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<rss version="2.0"');
      expect(xml).toContain('xmlns:torznab="http://torznab.com/schemas/2015/feed"');
      expect(xml).toContain('<channel>');
      expect(xml).toContain('<title>Test Indexer</title>');
      expect(xml).toContain('<item>');
      expect(xml).toContain('<title>Test Item 1</title>');
      expect(xml).toContain('<guid>item-1</guid>');
      expect(xml).toContain('<link>http://example.com/download/1</link>');
      expect(xml).toContain('torznab:attr name="size" value="1073741824"');
      expect(xml).toContain('torznab:attr name="seeders" value="10"');
      expect(xml).toContain('torznab:attr name="peers" value="5"');
    });

    it('should handle empty items array', () => {
      const xml = torznabService.generateRssXml('Test Indexer', []);

      expect(xml).toContain('<channel>');
      expect(xml).not.toContain('<item>');
    });
  });

  describe('convertToTorznabItems', () => {
    it('should convert parsed results to Torznab items', () => {
      const parsedResults: ParsedResult[] = [
        {
          title: 'Ubuntu 22.04 LTS',
          link: 'http://example.com/ubuntu.torrent',
          size: '2.5 GB',
          seeders: '100',
          leechers: '50',
          pubDate: '2024-01-01',
          category: 'Software',
        },
      ];

      const items = torznabService.convertToTorznabItems(parsedResults);

      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('Ubuntu 22.04 LTS');
      expect(items[0].link).toBe('http://example.com/ubuntu.torrent');
      expect(items[0].size).toBe(2.5 * 1000 ** 3); // 2.5 GB in bytes
      expect(items[0].seeders).toBe(100);
      expect(items[0].peers).toBe(50);
      expect(items[0].category).toBe(TORZNAB_CATEGORIES.PC);
    });

    it('should handle various size formats', () => {
      const parsedResults: ParsedResult[] = [
        { title: 'Test 1', link: 'http://example.com/1', size: '1.5 GB' },
        { title: 'Test 2', link: 'http://example.com/2', size: '500 MB' },
        { title: 'Test 3', link: 'http://example.com/3', size: '1024 KB' },
        { title: 'Test 4', link: 'http://example.com/4', size: '2 GiB' },
      ];

      const items = torznabService.convertToTorznabItems(parsedResults);

      expect(items[0].size).toBe(1.5 * 1000 ** 3); // 1.5 GB
      expect(items[1].size).toBe(500 * 1000 ** 2); // 500 MB
      expect(items[2].size).toBe(1024 * 1000); // 1024 KB
      expect(items[3].size).toBe(2 * 1024 ** 3); // 2 GiB
    });

    it('should map category names to Torznab IDs', () => {
      const parsedResults: ParsedResult[] = [
        { title: 'Movie', link: 'http://example.com/1', category: 'Movies HD' },
        { title: 'TV Show', link: 'http://example.com/2', category: 'TV Anime' },
        { title: 'Music', link: 'http://example.com/3', category: 'Audio MP3' },
        { title: 'Game', link: 'http://example.com/4', category: 'PC Games' },
      ];

      const items = torznabService.convertToTorznabItems(parsedResults);

      expect(items[0].category).toBe(TORZNAB_CATEGORIES.MOVIES_HD);
      expect(items[1].category).toBe(TORZNAB_CATEGORIES.TV_ANIME);
      expect(items[2].category).toBe(TORZNAB_CATEGORIES.AUDIO);
      expect(items[3].category).toBe(TORZNAB_CATEGORIES.PC_GAMES);
    });

    it('should use default category for unknown categories', () => {
      const parsedResults: ParsedResult[] = [
        { title: 'Unknown', link: 'http://example.com/1', category: 'Something Random' },
      ];

      const items = torznabService.convertToTorznabItems(parsedResults, TORZNAB_CATEGORIES.OTHER);

      expect(items[0].category).toBe(TORZNAB_CATEGORIES.OTHER);
    });

    it('should generate GUID if not provided', () => {
      const parsedResults: ParsedResult[] = [
        { title: 'Test', link: 'http://example.com/1' },
      ];

      const items = torznabService.convertToTorznabItems(parsedResults);

      expect(items[0].guid).toBe('http://example.com/1'); // Uses link as GUID
    });
  });

  describe('TORZNAB_CATEGORIES', () => {
    it('should have all major categories defined', () => {
      expect(TORZNAB_CATEGORIES.MOVIES).toBe(2000);
      expect(TORZNAB_CATEGORIES.TV).toBe(5000);
      expect(TORZNAB_CATEGORIES.AUDIO).toBe(3000);
      expect(TORZNAB_CATEGORIES.PC).toBe(4000);
      expect(TORZNAB_CATEGORIES.BOOKS).toBe(7000);
      expect(TORZNAB_CATEGORIES.OTHER).toBe(8000);
    });

    it('should have subcategories defined', () => {
      expect(TORZNAB_CATEGORIES.MOVIES_HD).toBe(2040);
      expect(TORZNAB_CATEGORIES.MOVIES_UHD).toBe(2045);
      expect(TORZNAB_CATEGORIES.TV_ANIME).toBe(5070);
      expect(TORZNAB_CATEGORIES.TV_SPORT).toBe(5060);
    });
  });
});
