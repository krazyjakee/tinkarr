import { ParsedResult } from './parser.service';

/**
 * Torznab category definitions
 * Based on Newznab/Torznab standard categories
 */
export const TORZNAB_CATEGORIES = {
  // Movies
  MOVIES: 2000,
  MOVIES_FOREIGN: 2010,
  MOVIES_OTHER: 2020,
  MOVIES_SD: 2030,
  MOVIES_HD: 2040,
  MOVIES_UHD: 2045,
  MOVIES_BLURAY: 2050,
  MOVIES_3D: 2060,

  // TV
  TV: 5000,
  TV_FOREIGN: 5020,
  TV_SD: 5030,
  TV_HD: 5040,
  TV_UHD: 5045,
  TV_OTHER: 5050,
  TV_SPORT: 5060,
  TV_ANIME: 5070,
  TV_DOCUMENTARY: 5080,

  // Audio
  AUDIO: 3000,
  AUDIO_MP3: 3010,
  AUDIO_VIDEO: 3020,
  AUDIO_AUDIOBOOK: 3030,
  AUDIO_LOSSLESS: 3040,

  // PC
  PC: 4000,
  PC_0DAY: 4010,
  PC_ISO: 4020,
  PC_MAC: 4030,
  PC_MOBILE_OTHER: 4040,
  PC_GAMES: 4050,
  PC_MOBILE_IOS: 4060,
  PC_MOBILE_ANDROID: 4070,

  // XXX
  XXX: 6000,
  XXX_DVD: 6010,
  XXX_WMV: 6020,
  XXX_XVID: 6030,
  XXX_X264: 6040,
  XXX_PACK: 6050,
  XXX_IMAGESET: 6060,
  XXX_OTHER: 6070,

  // Books
  BOOKS: 7000,
  BOOKS_MAGAZINES: 7010,
  BOOKS_EBOOK: 7020,
  BOOKS_COMICS: 7030,

  // Other
  OTHER: 8000,
  OTHER_MISC: 8010,
  OTHER_HASHED: 8020,
};

export interface TorznabItem {
  title: string;
  guid: string;
  link: string;
  pubDate: Date;
  size?: number;
  category?: number;
  seeders?: number;
  peers?: number;
  downloadVolumeFactor?: number;
  uploadVolumeFactor?: number;
  grabs?: number;
  description?: string;
  comments?: string;

  // Media IDs
  imdbId?: string;
  tvdbId?: string;
  tvMazeId?: string;
  tmdbId?: string;
  rageId?: string;

  // Content type
  type?: string; // 'movie' | 'series' | 'music' | 'book' | 'other'

  // Magnet and torrent info
  magnetUrl?: string;
  infoHash?: string;

  // Media URLs
  coverUrl?: string;
  bannerUrl?: string;

  // Tracker requirements
  minimumRatio?: number;
  minimumSeedTime?: number; // in seconds
}

export interface TorznabCapabilities {
  searching: {
    search: { available: boolean; supportedParams?: string[] };
    tvSearch: { available: boolean; supportedParams?: string[] };
    movieSearch: { available: boolean; supportedParams?: string[] };
    audioSearch?: { available: boolean; supportedParams?: string[] };
    bookSearch?: { available: boolean; supportedParams?: string[] };
  };
  categories: Array<{
    id: number;
    name: string;
    description?: string;
    subCategories?: Array<{ id: number; name: string }>;
  }>;
  server?: {
    url?: string;
    strapline?: string;
  };
  retention?: {
    days: number;
  };
}

export class TorznabService {
  /**
   * Generate Torznab capabilities XML response
   */
  public generateCapsXml(indexerTitle: string, capabilities?: TorznabCapabilities): string {
    const caps = capabilities || this.getDefaultCapabilities();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<caps>\n';

    // Server info
    xml += '  <server version="1.0" title="' + this.escapeXml(indexerTitle) + '"';
    if (caps.server?.strapline) {
      xml += ' strapline="' + this.escapeXml(caps.server.strapline) + '"';
    }
    if (caps.server?.url) {
      xml += ' url="' + this.escapeXml(caps.server.url) + '"';
    }
    xml += ' />\n';

    // Limits
    xml += '  <limits max="100" default="100" />\n';

    // Retention (optional)
    if (caps.retention) {
      xml += `  <retention days="${caps.retention.days}" />\n`;
    }

    // Registration (not available via API, but open for manual registration)
    xml += '  <registration available="no" open="yes" />\n';

    // Searching capabilities
    xml += '  <searching>\n';
    xml += `    <search available="${caps.searching.search.available ? 'yes' : 'no'}" supportedParams="${(caps.searching.search.supportedParams || ['q']).join(',')}" />\n`;
    xml += `    <tv-search available="${caps.searching.tvSearch.available ? 'yes' : 'no'}" supportedParams="${(caps.searching.tvSearch.supportedParams || ['q']).join(',')}" />\n`;
    xml += `    <movie-search available="${caps.searching.movieSearch.available ? 'yes' : 'no'}" supportedParams="${(caps.searching.movieSearch.supportedParams || ['q']).join(',')}" />\n`;
    if (caps.searching.audioSearch) {
      xml += `    <audio-search available="${caps.searching.audioSearch.available ? 'yes' : 'no'}" supportedParams="${(caps.searching.audioSearch.supportedParams || ['q']).join(',')}" />\n`;
    }
    if (caps.searching.bookSearch) {
      xml += `    <book-search available="${caps.searching.bookSearch.available ? 'yes' : 'no'}" supportedParams="${(caps.searching.bookSearch.supportedParams || ['q']).join(',')}" />\n`;
    }
    xml += '  </searching>\n';

    // Categories
    xml += '  <categories>\n';
    for (const category of caps.categories) {
      xml += `    <category id="${category.id}" name="${this.escapeXml(category.name)}"`;
      if (category.description) {
        xml += ` description="${this.escapeXml(category.description)}"`;
      }

      if (category.subCategories && category.subCategories.length > 0) {
        xml += '>\n';
        for (const subCat of category.subCategories) {
          xml += `      <subcat id="${subCat.id}" name="${this.escapeXml(subCat.name)}" />\n`;
        }
        xml += '    </category>\n';
      } else {
        xml += ' />\n';
      }
    }
    xml += '  </categories>\n';

    xml += '</caps>';

    return xml;
  }

  /**
   * Generate Torznab RSS feed XML response
   */
  public generateRssXml(indexerTitle: string, items: TorznabItem[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:torznab="http://torznab.com/schemas/2015/feed">\n';
    xml += '  <channel>\n';
    xml += '    <title>' + this.escapeXml(indexerTitle) + '</title>\n';
    xml += '    <description>Tinkarr - ' + this.escapeXml(indexerTitle) + '</description>\n';
    xml += '    <link>http://0.0.0.0:8677</link>\n';
    xml += '    <language>en-us</language>\n';

    // Add items
    for (const item of items) {
      xml += this.generateItemXml(item);
    }

    xml += '  </channel>\n';
    xml += '</rss>';

    return xml;
  }

  /**
   * Generate a single item XML
   */
  private generateItemXml(item: TorznabItem): string {
    let xml = '    <item>\n';
    xml += '      <title>' + this.escapeXml(item.title) + '</title>\n';
    xml += '      <guid>' + this.escapeXml(item.guid) + '</guid>\n';

    if (item.comments) {
      xml += '      <comments>' + this.escapeXml(item.comments) + '</comments>\n';
    }

    xml += '      <pubDate>' + item.pubDate.toUTCString() + '</pubDate>\n';

    // Add size as direct element (critical for many clients)
    if (item.size !== undefined) {
      xml += `      <size>${item.size}</size>\n`;
    }

    if (item.description) {
      xml += '      <description>' + this.escapeXml(item.description) + '</description>\n';
    }

    xml += '      <link>' + this.escapeXml(item.link) + '</link>\n';

    // Enclosure (standard RSS element)
    if (item.link && item.size) {
      // Use appropriate MIME type for magnet links vs torrent files
      const isMagnet = item.link.startsWith('magnet:');
      const enclosureType = isMagnet
        ? 'application/x-bittorrent;x-scheme-handler/magnet'
        : 'application/x-bittorrent';
      xml += `      <enclosure url="${this.escapeXml(item.link)}" length="${item.size}" type="${enclosureType}" />\n`;
    }

    // Torznab attributes
    if (item.size !== undefined) {
      xml += `      <torznab:attr name="size" value="${item.size}" />\n`;
    }

    if (item.category !== undefined) {
      xml += `      <torznab:attr name="category" value="${item.category}" />\n`;
    }

    if (item.seeders !== undefined) {
      xml += `      <torznab:attr name="seeders" value="${item.seeders}" />\n`;
    }

    if (item.peers !== undefined) {
      xml += `      <torznab:attr name="peers" value="${item.peers}" />\n`;
    }

    if (item.downloadVolumeFactor !== undefined) {
      xml += `      <torznab:attr name="downloadvolumefactor" value="${item.downloadVolumeFactor}" />\n`;
    }

    if (item.uploadVolumeFactor !== undefined) {
      xml += `      <torznab:attr name="uploadvolumefactor" value="${item.uploadVolumeFactor}" />\n`;
    }

    if (item.grabs !== undefined) {
      xml += `      <torznab:attr name="grabs" value="${item.grabs}" />\n`;
    }

    // Media IDs
    if (item.rageId) {
      xml += `      <torznab:attr name="rageid" value="${this.escapeXml(item.rageId)}" />\n`;
    }

    if (item.imdbId) {
      xml += `      <torznab:attr name="imdb" value="${this.escapeXml(item.imdbId)}" />\n`;
    }

    if (item.tvdbId) {
      xml += `      <torznab:attr name="tvdbid" value="${this.escapeXml(item.tvdbId)}" />\n`;
    }

    if (item.tvMazeId) {
      xml += `      <torznab:attr name="tvmazeid" value="${this.escapeXml(item.tvMazeId)}" />\n`;
    }

    if (item.tmdbId) {
      xml += `      <torznab:attr name="tmdbid" value="${this.escapeXml(item.tmdbId)}" />\n`;
    }

    // Content type
    if (item.type) {
      xml += `      <torznab:attr name="type" value="${this.escapeXml(item.type)}" />\n`;
    }

    // Magnet and torrent info
    if (item.magnetUrl) {
      xml += `      <torznab:attr name="magneturl" value="${this.escapeXml(item.magnetUrl)}" />\n`;
    }

    if (item.infoHash) {
      xml += `      <torznab:attr name="infohash" value="${this.escapeXml(item.infoHash)}" />\n`;
    }

    // Media URLs
    if (item.coverUrl) {
      xml += `      <torznab:attr name="coverurl" value="${this.escapeXml(item.coverUrl)}" />\n`;
    }

    if (item.bannerUrl) {
      xml += `      <torznab:attr name="bannerurl" value="${this.escapeXml(item.bannerUrl)}" />\n`;
    }

    // Tracker requirements
    if (item.minimumRatio !== undefined) {
      xml += `      <torznab:attr name="minimumratio" value="${item.minimumRatio}" />\n`;
    }

    if (item.minimumSeedTime !== undefined) {
      xml += `      <torznab:attr name="minimumseedtime" value="${item.minimumSeedTime}" />\n`;
    }

    xml += '    </item>\n';

    return xml;
  }

  /**
   * Convert parsed results to Torznab items
   */
  public convertToTorznabItems(
    results: ParsedResult[],
    defaultCategory: number = TORZNAB_CATEGORIES.OTHER
  ): TorznabItem[] {
    return results.map((result, index) => {
      // Parse size string to bytes
      const size = result.size ? this.parseSizeToBytes(result.size) : undefined;

      // Parse date
      const pubDate = result.pubDate ? this.parseDate(result.pubDate) : new Date();

      // Parse numeric fields
      const seeders = result.seeders ? parseInt(result.seeders, 10) : undefined;
      const peers = result.leechers ? parseInt(result.leechers, 10) : undefined;
      const grabs = result.grabs ? parseInt(result.grabs, 10) : undefined;

      // Map category name to ID if provided, otherwise use default
      const category = result.category
        ? this.mapCategoryNameToId(result.category) || defaultCategory
        : defaultCategory;

      // Generate GUID - prefer comments URL, then link, then magnet, then generate
      // GUID should be a stable identifier (preferably a page URL, not a magnet URL)
      const guid = result.guid || result.comments || result.link || result.magnetUrl || `item-${Date.now()}-${index}`;

      // Parse ratio and seed time
      const minimumRatio = result.minimumRatio ? parseFloat(result.minimumRatio) : undefined;
      const minimumSeedTime = result.minimumSeedTime ? parseInt(result.minimumSeedTime, 10) : undefined;

      return {
        title: result.title || 'Unknown',
        guid,
        link: result.magnetUrl || result.link || '',
        pubDate,
        size,
        category,
        seeders,
        peers,
        downloadVolumeFactor: 1,
        uploadVolumeFactor: 1,
        grabs,
        description: result.description || undefined,
        comments: result.comments || undefined,

        // Media IDs
        imdbId: result.imdb || result.imdbId || undefined,
        tvdbId: result.tvdbId || undefined,
        tvMazeId: result.tvMazeId || undefined,
        tmdbId: result.tmdbId || undefined,
        rageId: result.rageId || undefined,

        // Content type
        type: result.type || undefined,

        // Magnet and torrent info
        magnetUrl: result.magnetUrl || undefined,
        infoHash: result.infoHash || undefined,

        // Media URLs
        coverUrl: result.coverUrl || undefined,
        bannerUrl: result.bannerUrl || undefined,

        // Tracker requirements
        minimumRatio,
        minimumSeedTime,
      };
    });
  }

  /**
   * Parse size string to bytes
   * Examples: "1.5 GB", "500 MB", "1024 KB"
   */
  private parseSizeToBytes(sizeString: string): number | undefined {
    const match = sizeString.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB|KiB|MiB|GiB|TiB)?$/i);

    if (!match) {
      return undefined;
    }

    const value = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();

    const multipliers: Record<string, number> = {
      B: 1,
      KB: 1000,
      MB: 1000 ** 2,
      GB: 1000 ** 3,
      TB: 1000 ** 4,
      KIB: 1024,
      MIB: 1024 ** 2,
      GIB: 1024 ** 3,
      TIB: 1024 ** 4,
    };

    return Math.floor(value * (multipliers[unit] || 1));
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(dateString: string): Date {
    // Try parsing as ISO date first
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Try common date formats
    // Add more parsing logic as needed
    return new Date();
  }

  /**
   * Map category name to Torznab category ID
   */
  private mapCategoryNameToId(categoryName: string): number | undefined {
    const name = categoryName.toLowerCase();

    // Movies
    if (name.includes('movie') || name.includes('film')) {
      if (name.includes('uhd') || name.includes('4k')) return TORZNAB_CATEGORIES.MOVIES_UHD;
      if (name.includes('hd') || name.includes('1080') || name.includes('720'))
        return TORZNAB_CATEGORIES.MOVIES_HD;
      if (name.includes('bluray') || name.includes('blu-ray'))
        return TORZNAB_CATEGORIES.MOVIES_BLURAY;
      if (name.includes('3d')) return TORZNAB_CATEGORIES.MOVIES_3D;
      return TORZNAB_CATEGORIES.MOVIES;
    }

    // TV
    if (
      name.includes('tv') ||
      name.includes('television') ||
      name.includes('series') ||
      name.includes('episode')
    ) {
      if (name.includes('anime')) return TORZNAB_CATEGORIES.TV_ANIME;
      if (name.includes('sport')) return TORZNAB_CATEGORIES.TV_SPORT;
      if (name.includes('documentary') || name.includes('docu'))
        return TORZNAB_CATEGORIES.TV_DOCUMENTARY;
      if (name.includes('uhd') || name.includes('4k')) return TORZNAB_CATEGORIES.TV_UHD;
      if (name.includes('hd') || name.includes('1080') || name.includes('720'))
        return TORZNAB_CATEGORIES.TV_HD;
      return TORZNAB_CATEGORIES.TV;
    }

    // Audio
    if (name.includes('audio') || name.includes('music') || name.includes('mp3')) {
      if (name.includes('audiobook')) return TORZNAB_CATEGORIES.AUDIO_AUDIOBOOK;
      if (name.includes('lossless') || name.includes('flac'))
        return TORZNAB_CATEGORIES.AUDIO_LOSSLESS;
      if (name.includes('video') || name.includes('concert'))
        return TORZNAB_CATEGORIES.AUDIO_VIDEO;
      return TORZNAB_CATEGORIES.AUDIO;
    }

    // Games
    if (name.includes('game')) {
      if (name.includes('pc')) return TORZNAB_CATEGORIES.PC_GAMES;
      if (name.includes('android')) return TORZNAB_CATEGORIES.PC_MOBILE_ANDROID;
      if (name.includes('ios')) return TORZNAB_CATEGORIES.PC_MOBILE_IOS;
      return TORZNAB_CATEGORIES.PC_GAMES;
    }

    // Software
    if (name.includes('software') || name.includes('app')) {
      if (name.includes('mac')) return TORZNAB_CATEGORIES.PC_MAC;
      if (name.includes('mobile')) return TORZNAB_CATEGORIES.PC_MOBILE_OTHER;
      return TORZNAB_CATEGORIES.PC;
    }

    // Books
    if (name.includes('book') || name.includes('ebook')) {
      if (name.includes('comic')) return TORZNAB_CATEGORIES.BOOKS_COMICS;
      if (name.includes('magazine')) return TORZNAB_CATEGORIES.BOOKS_MAGAZINES;
      return TORZNAB_CATEGORIES.BOOKS_EBOOK;
    }

    // Default
    return TORZNAB_CATEGORIES.OTHER;
  }

  /**
   * Get default capabilities
   */
  private getDefaultCapabilities(): TorznabCapabilities {
    return {
      searching: {
        search: { available: true, supportedParams: ['q'] },
        tvSearch: { available: true, supportedParams: ['q'] },
        movieSearch: { available: true, supportedParams: ['q'] },
      },
      categories: [
        {
          id: TORZNAB_CATEGORIES.MOVIES,
          name: 'Movies',
          subCategories: [
            { id: TORZNAB_CATEGORIES.MOVIES_FOREIGN, name: 'Foreign' },
            { id: TORZNAB_CATEGORIES.MOVIES_SD, name: 'SD' },
            { id: TORZNAB_CATEGORIES.MOVIES_HD, name: 'HD' },
            { id: TORZNAB_CATEGORIES.MOVIES_UHD, name: 'UHD' },
            { id: TORZNAB_CATEGORIES.MOVIES_BLURAY, name: 'BluRay' },
            { id: TORZNAB_CATEGORIES.MOVIES_3D, name: '3D' },
          ],
        },
        {
          id: TORZNAB_CATEGORIES.TV,
          name: 'TV',
          subCategories: [
            { id: TORZNAB_CATEGORIES.TV_FOREIGN, name: 'Foreign' },
            { id: TORZNAB_CATEGORIES.TV_SD, name: 'SD' },
            { id: TORZNAB_CATEGORIES.TV_HD, name: 'HD' },
            { id: TORZNAB_CATEGORIES.TV_UHD, name: 'UHD' },
            { id: TORZNAB_CATEGORIES.TV_SPORT, name: 'Sport' },
            { id: TORZNAB_CATEGORIES.TV_ANIME, name: 'Anime' },
            { id: TORZNAB_CATEGORIES.TV_DOCUMENTARY, name: 'Documentary' },
          ],
        },
        {
          id: TORZNAB_CATEGORIES.AUDIO,
          name: 'Audio',
          subCategories: [
            { id: TORZNAB_CATEGORIES.AUDIO_MP3, name: 'MP3' },
            { id: TORZNAB_CATEGORIES.AUDIO_VIDEO, name: 'Video' },
            { id: TORZNAB_CATEGORIES.AUDIO_AUDIOBOOK, name: 'Audiobook' },
            { id: TORZNAB_CATEGORIES.AUDIO_LOSSLESS, name: 'Lossless' },
          ],
        },
        {
          id: TORZNAB_CATEGORIES.PC,
          name: 'PC',
          subCategories: [
            { id: TORZNAB_CATEGORIES.PC_0DAY, name: '0day' },
            { id: TORZNAB_CATEGORIES.PC_ISO, name: 'ISO' },
            { id: TORZNAB_CATEGORIES.PC_MAC, name: 'Mac' },
            { id: TORZNAB_CATEGORIES.PC_GAMES, name: 'Games' },
          ],
        },
        {
          id: TORZNAB_CATEGORIES.BOOKS,
          name: 'Books',
          subCategories: [
            { id: TORZNAB_CATEGORIES.BOOKS_EBOOK, name: 'EBook' },
            { id: TORZNAB_CATEGORIES.BOOKS_COMICS, name: 'Comics' },
            { id: TORZNAB_CATEGORIES.BOOKS_MAGAZINES, name: 'Magazines' },
          ],
        },
        {
          id: TORZNAB_CATEGORIES.OTHER,
          name: 'Other',
          subCategories: [{ id: TORZNAB_CATEGORIES.OTHER_MISC, name: 'Misc' }],
        },
      ],
    };
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Parse category string to array of category IDs
   * Examples: "5000,5040" -> [5000, 5040], "5000" -> [5000]
   */
  public parseCategoryString(categoryString: string | undefined): number[] | undefined {
    if (!categoryString) {
      return undefined;
    }

    const categories = categoryString
      .split(',')
      .map((cat) => parseInt(cat.trim(), 10))
      .filter((cat) => !isNaN(cat));

    return categories.length > 0 ? categories : undefined;
  }

  /**
   * Check if an item's category matches any of the requested categories
   * Supports parent category matching (e.g., 5000 matches 5030, 5040, etc.)
   */
  public categoryMatches(itemCategory: number, requestedCategories: number[]): boolean {
    for (const reqCat of requestedCategories) {
      // Exact match
      if (itemCategory === reqCat) {
        return true;
      }

      // Parent category match - if requesting parent (e.g., 5000), match children (5030, 5040, etc.)
      // Parent categories are: 2000, 3000, 4000, 5000, 6000, 7000, 8000
      const isParentCategory = reqCat % 1000 === 0;
      if (isParentCategory) {
        const itemParent = Math.floor(itemCategory / 1000) * 1000;
        if (itemParent === reqCat) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Filter Torznab items by requested categories
   * If no categories specified, returns all items
   */
  public filterItemsByCategories(
    items: TorznabItem[],
    requestedCategories: number[] | undefined
  ): TorznabItem[] {
    if (!requestedCategories || requestedCategories.length === 0) {
      return items;
    }

    return items.filter((item) => {
      if (item.category === undefined) {
        // Items without a category are included if OTHER category (8000) is requested
        return requestedCategories.includes(TORZNAB_CATEGORIES.OTHER) ||
               requestedCategories.includes(TORZNAB_CATEGORIES.OTHER_MISC);
      }

      return this.categoryMatches(item.category, requestedCategories);
    });
  }
}

// Export singleton instance
export const torznabService = new TorznabService();
