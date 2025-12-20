import request from 'supertest';
import express, { Express } from 'express';
import indexersRoutes from '../../api/admin/indexers.routes';
import authRoutes from '../../api/auth/auth.routes';
import { db } from '../../db';
import { users, indexers } from '../../db/schema';
import { eq } from 'drizzle-orm';

describe('Indexers Routes Integration Tests', () => {
  let app: Express;
  let testToken: string;
  let testUsername: string;
  let testIndexerId: number;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/indexers', indexersRoutes);

    // Create test user and get token
    testUsername = `testuser_indexer_${Date.now()}`;
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: testUsername,
        password: 'TestPassword123',
      });

    testToken = registerResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await db.delete(users).where(eq(users.username, testUsername));
      if (testIndexerId) {
        await db.delete(indexers).where(eq(indexers.id, testIndexerId));
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/indexers', () => {
    it('should create a new indexer', async () => {
      const response = await request(app)
        .post('/api/indexers')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Test Indexer',
          url: 'https://example.com',
          searchType: 'html_form',
          searchUrl: 'https://example.com/search',
          searchMethod: 'GET',
          searchQueryParam: 'q',
          resultSelector: '.result',
          resultMapping: {
            title: '.title',
            link: 'a@href',
            size: '.size',
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'Test Indexer');
      expect(response.body).toHaveProperty('url', 'https://example.com');
      expect(response.body).toHaveProperty('enabled', true);

      testIndexerId = response.body.id;
    });

    it('should reject creation without authentication', async () => {
      await request(app)
        .post('/api/indexers')
        .send({
          title: 'Test Indexer',
          url: 'https://example.com',
        })
        .expect(401);
    });

    it('should reject creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/indexers')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Incomplete Indexer',
          // Missing url and other required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/indexers', () => {
    it('should list all indexers', async () => {
      const response = await request(app)
        .get('/api/indexers')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const createdIndexer = response.body.find((idx: any) => idx.id === testIndexerId);
      expect(createdIndexer).toBeDefined();
      expect(createdIndexer.title).toBe('Test Indexer');
    });

    it('should reject listing without authentication', async () => {
      await request(app)
        .get('/api/indexers')
        .expect(401);
    });
  });

  describe('GET /api/indexers/:id', () => {
    it('should get indexer by ID', async () => {
      const response = await request(app)
        .get(`/api/indexers/${testIndexerId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testIndexerId);
      expect(response.body).toHaveProperty('title', 'Test Indexer');
      expect(response.body).toHaveProperty('url', 'https://example.com');
    });

    it('should return 404 for non-existent indexer', async () => {
      await request(app)
        .get('/api/indexers/999999')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);
    });

    it('should reject get without authentication', async () => {
      await request(app)
        .get(`/api/indexers/${testIndexerId}`)
        .expect(401);
    });
  });

  describe('PUT /api/indexers/:id', () => {
    it('should update indexer', async () => {
      const response = await request(app)
        .put(`/api/indexers/${testIndexerId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Updated Test Indexer',
          url: 'https://example.com',
          searchType: 'html_form',
          searchUrl: 'https://example.com/search',
          searchMethod: 'POST',
          searchQueryParam: 'query',
          resultSelector: '.result-row',
          resultMapping: {
            title: '.result-title',
            link: 'a.download@href',
          },
        })
        .expect(200);

      expect(response.body).toHaveProperty('title', 'Updated Test Indexer');
      expect(response.body).toHaveProperty('searchMethod', 'POST');
      expect(response.body).toHaveProperty('resultSelector', '.result-row');
    });

    it('should reject update without authentication', async () => {
      await request(app)
        .put(`/api/indexers/${testIndexerId}`)
        .send({ title: 'Unauthorized Update' })
        .expect(401);
    });

    it('should return 404 for non-existent indexer', async () => {
      await request(app)
        .put('/api/indexers/999999')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ title: 'Non-existent' })
        .expect(404);
    });
  });

  describe('POST /api/indexers/:id/toggle', () => {
    it('should toggle indexer enabled status', async () => {
      // Get current status
      const getResponse = await request(app)
        .get(`/api/indexers/${testIndexerId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      const currentStatus = getResponse.body.enabled;

      // Toggle status
      const toggleResponse = await request(app)
        .post(`/api/indexers/${testIndexerId}/toggle`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(toggleResponse.body).toHaveProperty('enabled', !currentStatus);

      // Toggle back
      const toggleBackResponse = await request(app)
        .post(`/api/indexers/${testIndexerId}/toggle`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(toggleBackResponse.body).toHaveProperty('enabled', currentStatus);
    });

    it('should reject toggle without authentication', async () => {
      await request(app)
        .post(`/api/indexers/${testIndexerId}/toggle`)
        .expect(401);
    });
  });

  describe('DELETE /api/indexers/:id', () => {
    it('should delete indexer', async () => {
      // Create a new indexer to delete
      const createResponse = await request(app)
        .post('/api/indexers')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Indexer To Delete',
          url: 'https://example.com',
          searchType: 'html_form',
          searchUrl: 'https://example.com/search',
          searchMethod: 'GET',
          searchQueryParam: 'q',
          resultSelector: '.result',
          resultMapping: { title: '.title' },
        })
        .expect(201);

      const indexerToDeleteId = createResponse.body.id;

      // Delete the indexer
      await request(app)
        .delete(`/api/indexers/${indexerToDeleteId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(204);

      // Verify it's deleted
      await request(app)
        .get(`/api/indexers/${indexerToDeleteId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);
    });

    it('should reject delete without authentication', async () => {
      await request(app)
        .delete(`/api/indexers/${testIndexerId}`)
        .expect(401);
    });

    it('should return 404 for non-existent indexer', async () => {
      await request(app)
        .delete('/api/indexers/999999')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);
    });
  });
});
