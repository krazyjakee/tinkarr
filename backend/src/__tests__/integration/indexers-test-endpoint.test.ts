import request from 'supertest';
import express, { Express } from 'express';
import indexersRoutes from '../../api/admin/indexers.routes';
import authRoutes from '../../api/auth/auth.routes';
import { db } from '../../db';
import { users, indexers } from '../../db/schema';
import { eq } from 'drizzle-orm';

describe('Indexers Test Endpoint Integration Tests', () => {
  let app: Express;
  let testToken: string;
  let testUsername: string;
  let rssIndexerId: number;
  let generatorIndexerId: number;
  let noRssIndexerId: number;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/indexers', indexersRoutes);

    // Create test user and get token
    testUsername = `testuser_test_endpoint_${Date.now()}`;
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: testUsername,
        password: 'TestPassword123',
      });

    testToken = registerResponse.body.token;

    // Create test indexer with RSS static params
    const rssResponse = await request(app)
      .post('/api/indexers')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        title: 'Test RSS Indexer',
        url: 'https://example.com',
        searchType: 'html_form',
        searchUrl: 'https://example.com/search',
        searchMethod: 'GET',
        searchQueryParam: 'q',
        searchParams: {},
        rssUrl: 'https://example.com/rss',
        rssMethod: 'GET',
        rssParams: {
          t: '2000',
          cat: '5030,5040',
          extended: '1',
        },
        resultSelector: '.result',
        resultMapping: {
          title: '.title',
          link: 'a@href',
        },
      });
    rssIndexerId = rssResponse.body.id;

    // Create test indexer with RSS URL generator code
    const generatorResponse = await request(app)
      .post('/api/indexers')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        title: 'Test RSS Generator Indexer',
        url: 'https://example.com',
        searchType: 'html_form',
        searchUrl: 'https://example.com/search',
        searchMethod: 'GET',
        searchQueryParam: 'q',
        searchParams: {},
        rssUrl: 'https://example.com/api',
        rssMethod: 'GET',
        rssUrlGeneratorCode: `
          const params = { t: "tvsearch" };
          if (imdbId) params.imdbid = imdbId;
          if (tvdbId) params.tvdbid = tvdbId;
          if (season) params.season = season.toString();
          if (episode) params.ep = episode.toString();
          return params;
        `,
        resultSelector: '.result',
        resultMapping: {
          title: '.title',
          link: 'a@href',
        },
      });
    generatorIndexerId = generatorResponse.body.id;

    // Create test indexer without RSS configuration
    const noRssResponse = await request(app)
      .post('/api/indexers')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        title: 'Test No RSS Indexer',
        url: 'https://example.com',
        searchType: 'html_form',
        searchUrl: 'https://example.com/search',
        searchMethod: 'GET',
        searchQueryParam: 'q',
        searchParams: {},
        resultSelector: '.result',
        resultMapping: {
          title: '.title',
          link: 'a@href',
        },
      });
    noRssIndexerId = noRssResponse.body.id;
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await db.delete(users).where(eq(users.username, testUsername));
      if (rssIndexerId) await db.delete(indexers).where(eq(indexers.id, rssIndexerId));
      if (generatorIndexerId) await db.delete(indexers).where(eq(indexers.id, generatorIndexerId));
      if (noRssIndexerId) await db.delete(indexers).where(eq(indexers.id, noRssIndexerId));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/indexers/:id/test - RSS Fallback with Static Params', () => {
    it('should use RSS URL with params when query is empty', async () => {
      const response = await request(app)
        .post(`/api/indexers/${rssIndexerId}/test`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          query: '',
          season: 1,
          episode: 5,
          imdbId: 'tt1234567',
          tvdbId: '12345',
          categories: [5030, 5040],
        });

      // Log for debugging
      if (response.status !== 200) {
        console.error('Status:', response.status);
        console.error('Body:', response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('usedRss', true);
      expect(response.body).toHaveProperty('targetUrl');
      expect(response.body.targetUrl).toContain('https://example.com/rss');
      expect(response.body.targetUrl).toContain('t=2000');
      expect(response.body.targetUrl).toContain('cat=5030');
      expect(response.body.targetUrl).toContain('extended=1');
      expect(response.body).toHaveProperty('rssParams');
      expect(response.body.rssParams).toEqual({
        t: '2000',
        cat: '5030,5040',
        extended: '1',
      });
    });

    it('should use RSS URL with params when query is undefined', async () => {
      const response = await request(app)
        .post(`/api/indexers/${rssIndexerId}/test`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          season: 2,
          episode: 10,
          imdbId: 'tt7654321',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('usedRss', true);
      expect(response.body.targetUrl).toContain('https://example.com/rss');
      expect(response.body.targetUrl).toContain('t=2000');
    });

    it('should use search URL when query is provided', async () => {
      const response = await request(app)
        .post(`/api/indexers/${rssIndexerId}/test`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          query: 'test movie',
          season: 1,
          episode: 5,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('usedRss', false);
      expect(response.body.targetUrl).toContain('https://example.com/search');
      expect(response.body.targetUrl).toContain('q=test+movie');
    });
  });

  describe('POST /api/indexers/:id/test - RSS with Generator Code', () => {
    it('should use RSS URL with generated params when query is empty', async () => {
      const response = await request(app)
        .post(`/api/indexers/${generatorIndexerId}/test`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          query: '',
          season: 3,
          episode: 7,
          imdbId: 'tt9876543',
          tvdbId: '54321',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('usedRss', true);
      expect(response.body.targetUrl).toContain('https://example.com/api');
      expect(response.body.targetUrl).toContain('t=tvsearch');
      expect(response.body.targetUrl).toContain('imdbid=tt9876543');
      expect(response.body.targetUrl).toContain('tvdbid=54321');
      expect(response.body.targetUrl).toContain('season=3');
      expect(response.body.targetUrl).toContain('ep=7');
      expect(response.body).toHaveProperty('rssParams');
      expect(response.body.rssParams).toMatchObject({
        t: 'tvsearch',
        imdbid: 'tt9876543',
        tvdbid: '54321',
        season: '3',
        ep: '7',
      });
    });

    it('should handle missing context values gracefully', async () => {
      const response = await request(app)
        .post(`/api/indexers/${generatorIndexerId}/test`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          query: '',
          imdbId: 'tt1111111',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('usedRss', true);
      expect(response.body.targetUrl).toContain('t=tvsearch');
      expect(response.body.targetUrl).toContain('imdbid=tt1111111');
      expect(response.body.targetUrl).not.toContain('season=');
      expect(response.body.targetUrl).not.toContain('ep=');
    });
  });

  describe('POST /api/indexers/:id/test - No RSS Configuration', () => {
    it('should use search URL even when query is empty if no RSS is configured', async () => {
      const response = await request(app)
        .post(`/api/indexers/${noRssIndexerId}/test`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          query: '',
          season: 1,
          episode: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('usedRss', false);
      expect(response.body.targetUrl).toContain('https://example.com/search');
    });
  });
});
