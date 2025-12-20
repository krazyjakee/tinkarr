import request from 'supertest';
import express, { Express } from 'express';
import authRoutes from '../../api/auth/auth.routes';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { generateApiKey } from '../../utils/jwt';

describe('Auth Routes Integration Tests', () => {
  let app: Express;
  let testUsername: string;
  let testPassword: string;
  let testToken: string;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    // Clean up test users
    testUsername = `testuser_${Date.now()}`;
    testPassword = 'TestPassword123';
  });

  afterAll(async () => {
    // Clean up test users
    try {
      await db.delete(users).where(eq(users.username, testUsername));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: testUsername,
          password: testPassword,
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username', testUsername);
      expect(response.body.user).toHaveProperty('apiKey');

      // Save token for later tests
      testToken = response.body.token;
    });

    it('should reject duplicate username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: testUsername,
          password: 'AnotherPassword123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should reject invalid username format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab', // Too short
          password: testPassword,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid password format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          password: '123', // Too short
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUsername,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', testUsername);
      expect(response.body.user).toHaveProperty('apiKey');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUsername,
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject non-existent username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistentuser',
          password: testPassword,
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username', testUsername);
      expect(response.body).toHaveProperty('apiKey');
    });

    it('should reject request without token', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/auth/regenerate-api-key', () => {
    it('should regenerate API key with valid token', async () => {
      // Get current API key
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      const oldApiKey = meResponse.body.apiKey;

      // Regenerate API key
      const response = await request(app)
        .post('/api/auth/regenerate-api-key')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('apiKey');
      expect(response.body.apiKey).not.toBe(oldApiKey);

      // Verify new API key is saved
      const verifyResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(verifyResponse.body.apiKey).toBe(response.body.apiKey);
    });

    it('should reject request without token', async () => {
      await request(app)
        .post('/api/auth/regenerate-api-key')
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Logged out successfully');
    });

    it('should reject logout without token', async () => {
      await request(app)
        .post('/api/auth/logout')
        .expect(401);
    });
  });
});
