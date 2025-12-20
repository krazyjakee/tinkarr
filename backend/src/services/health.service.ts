import { db } from '../db';
import { indexers, settings } from '../db/schema';
import { eq } from 'drizzle-orm';
import { ScraperService } from './scraper.service';
import { SettingsService } from './settings.service';

export interface IndexerHealth {
  indexerId: number;
  title: string;
  status: 'healthy' | 'unhealthy' | 'disabled';
  lastChecked: string;
  errorMessage?: string;
  responseTime?: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: boolean;
  flaresolverr: boolean;
  indexers: {
    total: number;
    enabled: number;
    healthy: number;
    unhealthy: number;
  };
  uptime: number;
  timestamp: string;
}

/**
 * Service for health checks and dead indexer detection
 */
export class HealthService {
  private settingsService: SettingsService;
  private scraperService: ScraperService;
  private startTime: number;

  constructor() {
    this.settingsService = new SettingsService();
    this.scraperService = new ScraperService(this.settingsService);
    this.startTime = Date.now();
  }

  /**
   * Check system health
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Check database
    const dbHealthy = await this.checkDatabase();

    // Check Flaresolverr
    const flaresolverrHealthy = await this.checkFlaresolverr();

    // Check indexers
    const allIndexers = await db.select().from(indexers);
    const enabledIndexers = allIndexers.filter((idx) => idx.enabled);

    const indexerHealthChecks = await Promise.all(
      enabledIndexers.map((idx) => this.checkIndexerHealth(idx.id))
    );

    const healthyCount = indexerHealthChecks.filter(
      (h) => h.status === 'healthy'
    ).length;
    const unhealthyCount = indexerHealthChecks.filter(
      (h) => h.status === 'unhealthy'
    ).length;

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!dbHealthy) {
      status = 'unhealthy';
    } else if (!flaresolverrHealthy || unhealthyCount > 0) {
      status = 'degraded';
    }

    return {
      status,
      database: dbHealthy,
      flaresolverr: flaresolverrHealthy,
      indexers: {
        total: allIndexers.length,
        enabled: enabledIndexers.length,
        healthy: healthyCount,
        unhealthy: unhealthyCount,
      },
      uptime,
      timestamp,
    };
  }

  /**
   * Check specific indexer health
   */
  async checkIndexerHealth(indexerId: number): Promise<IndexerHealth> {
    const lastChecked = new Date().toISOString();

    try {
      const indexer = await db
        .select()
        .from(indexers)
        .where(eq(indexers.id, indexerId))
        .limit(1);

      if (indexer.length === 0) {
        return {
          indexerId,
          title: 'Unknown',
          status: 'unhealthy',
          lastChecked,
          errorMessage: 'Indexer not found',
        };
      }

      const idx = indexer[0];

      if (!idx.enabled) {
        return {
          indexerId,
          title: idx.title,
          status: 'disabled',
          lastChecked,
        };
      }

      // Perform a simple test scrape
      const startTime = Date.now();
      const result = await this.scraperService.scrape(idx, '', {
        useFlaresolverr: idx.requiresFlaresolverr,
      });
      const responseTime = Date.now() - startTime;

      if (result.success) {
        return {
          indexerId,
          title: idx.title,
          status: 'healthy',
          lastChecked,
          responseTime,
        };
      } else {
        return {
          indexerId,
          title: idx.title,
          status: 'unhealthy',
          lastChecked,
          errorMessage: result.error || 'Unknown error',
          responseTime,
        };
      }
    } catch (error) {
      return {
        indexerId,
        title: 'Unknown',
        status: 'unhealthy',
        lastChecked,
        errorMessage:
          error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check all enabled indexers and return their health status
   */
  async checkAllIndexers(): Promise<IndexerHealth[]> {
    try {
      const enabledIndexers = await db
        .select()
        .from(indexers)
        .where(eq(indexers.enabled, true));

      const healthChecks = await Promise.all(
        enabledIndexers.map((idx) => this.checkIndexerHealth(idx.id))
      );

      return healthChecks;
    } catch (error) {
      console.error('Failed to check all indexers:', error);
      return [];
    }
  }

  /**
   * Detect dead indexers (consecutive failures)
   * In a production app, this would track failures over time
   * For now, we just check if they're currently unhealthy
   */
  async detectDeadIndexers(): Promise<IndexerHealth[]> {
    const allHealthChecks = await this.checkAllIndexers();
    return allHealthChecks.filter((h) => h.status === 'unhealthy');
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      await db.select().from(settings).limit(1);
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Check Flaresolverr connectivity
   */
  private async checkFlaresolverr(): Promise<boolean> {
    try {
      const flaresolverrEnabled = await this.settingsService.get(
        'flaresolverr_enabled'
      );
      if (flaresolverrEnabled !== 'true') {
        return true; // Not enabled, so consider it "healthy" (not needed)
      }

      const flaresolverrUrl = await this.settingsService.get(
        'flaresolverr_url'
      );
      if (!flaresolverrUrl) {
        return false;
      }

      // Simple connectivity check
      const response = await fetch(flaresolverrUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: 'sessions.list' }),
      });

      return response.ok;
    } catch (error) {
      console.error('Flaresolverr health check failed:', error);
      return false;
    }
  }
}
