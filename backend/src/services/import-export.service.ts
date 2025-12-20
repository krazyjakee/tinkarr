import { db } from '../db';
import { indexers, type Indexer, type NewIndexer } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface ExportData {
  version: string;
  exportDate: string;
  indexers: Partial<Indexer>[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Service for importing and exporting indexer configurations
 */
export class ImportExportService {
  private readonly EXPORT_VERSION = '1.0';

  /**
   * Export all indexers to JSON
   */
  async exportIndexers(indexerIds?: number[]): Promise<ExportData> {
    try {
      let allIndexers: Indexer[];

      if (indexerIds && indexerIds.length > 0) {
        // Export specific indexers
        const promises = indexerIds.map((id) =>
          db.select().from(indexers).where(eq(indexers.id, id)).limit(1)
        );
        const results = await Promise.all(promises);
        allIndexers = results.flat();
      } else {
        // Export all indexers
        allIndexers = await db.select().from(indexers);
      }

      // Remove internal fields (id, timestamps) for portability
      const exportIndexers = allIndexers.map((idx) => {
        const { id, createdAt, updatedAt, ...exportData } = idx;
        return exportData;
      });

      return {
        version: this.EXPORT_VERSION,
        exportDate: new Date().toISOString(),
        indexers: exportIndexers,
      };
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to export indexers');
    }
  }

  /**
   * Import indexers from JSON
   */
  async importIndexers(
    data: ExportData,
    options: {
      overwrite?: boolean;
      skipExisting?: boolean;
    } = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Validate export version
      if (data.version !== this.EXPORT_VERSION) {
        result.errors.push(
          `Unsupported export version: ${data.version}. Expected: ${this.EXPORT_VERSION}`
        );
        result.success = false;
        return result;
      }

      // Import each indexer
      for (const indexerData of data.indexers) {
        try {
          await this.importSingleIndexer(indexerData, options, result);
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Failed to import "${indexerData.title}": ${errorMsg}`);
        }
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Import failed'
      );
      return result;
    }
  }

  /**
   * Import a single indexer
   */
  private async importSingleIndexer(
    indexerData: Partial<Indexer>,
    options: { overwrite?: boolean; skipExisting?: boolean },
    result: ImportResult
  ): Promise<void> {
    // Check if indexer with same title and URL already exists
    const existing = await db
      .select()
      .from(indexers)
      .where(eq(indexers.title, indexerData.title || ''));

    if (existing.length > 0) {
      const existingIndexer = existing[0];

      if (options.skipExisting) {
        result.skipped++;
        return;
      }

      if (options.overwrite) {
        // Update existing indexer
        await db
          .update(indexers)
          .set({
            ...indexerData,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(indexers.id, existingIndexer.id));
        result.imported++;
        return;
      }

      // Default: skip if exists
      result.skipped++;
      return;
    }

    // Insert new indexer
    const newIndexer: NewIndexer = {
      title: indexerData.title || 'Untitled',
      url: indexerData.url || '',
      favicon: indexerData.favicon || null,
      requiresFlaresolverr: indexerData.requiresFlaresolverr ?? false,
      enabled: indexerData.enabled ?? true,
      searchType: indexerData.searchType || null,
      searchUrl: indexerData.searchUrl || null,
      searchMethod: indexerData.searchMethod || null,
      searchParams: indexerData.searchParams || null,
      searchQueryParam: indexerData.searchQueryParam || null,
      rssUrl: indexerData.rssUrl || null,
      rssType: indexerData.rssType || null,
      rssParams: indexerData.rssParams || null,
      resultSelector: indexerData.resultSelector || null,
      resultMapping: indexerData.resultMapping || null,
    };

    await db.insert(indexers).values(newIndexer);
    result.imported++;
  }

  /**
   * Create a backup of all indexers
   */
  async createBackup(): Promise<string> {
    const exportData = await this.exportIndexers();
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupJson: string): Promise<ImportResult> {
    try {
      const data = JSON.parse(backupJson) as ExportData;
      return await this.importIndexers(data, { overwrite: true });
    } catch (error) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [
          error instanceof Error
            ? error.message
            : 'Failed to parse backup JSON',
        ],
      };
    }
  }

  /**
   * Validate import data structure
   */
  validateImportData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.version) {
      errors.push('Missing version field');
    }

    if (!data.indexers || !Array.isArray(data.indexers)) {
      errors.push('Missing or invalid indexers array');
    }

    if (data.indexers) {
      for (let i = 0; i < data.indexers.length; i++) {
        const idx = data.indexers[i];
        if (!idx.title) {
          errors.push(`Indexer at position ${i} missing title`);
        }
        if (!idx.url) {
          errors.push(`Indexer at position ${i} missing url`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
