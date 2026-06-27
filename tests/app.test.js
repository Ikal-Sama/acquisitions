import request from 'supertest';
import app from '#src/app.js';

describe('API Endpoints', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /', () => {
    it('should return welcome message', async () => {
      const response = await request(app).get('/').expect(200);

      expect(response.text).toBe('Hello from Acquisitions!');
    });
  });

  describe('GET /api', () => {
    it('should return API message', async () => {
      const response = await request(app).get('/api').expect(200);

      expect(response.body).toHaveProperty(
        'message',
        'Acquisition API is running!'
      );
    });
  });

  describe('GET /nonexistent route', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/nonexistent').expect(404);

      expect(response.body).toHaveProperty('error', 'Route Not found!');
    });
  });

  describe('Route mounting', () => {
    const routes = [
      { path: '/api/users', method: 'get' },
      { path: '/api/vendors', method: 'get' },
      { path: '/api/requisitions', method: 'get' },
      { path: '/api/purchase-orders', method: 'get' },
      { path: '/api/assets', method: 'get' },
      { path: '/api/departments', method: 'get' },
      { path: '/api/budgets', method: 'get' },
      { path: '/api/analytics', method: 'get' },
      { path: '/api/auth/sign-up', method: 'post' },
      { path: '/api/auth/sign-in', method: 'post' },
      { path: '/api/auth/sign-out', method: 'post' },
    ];

    routes.forEach(({ path, method }) => {
      it(`should have ${method.toUpperCase()} ${path} mounted`, async () => {
        const response = await request(app)[method](path);

        expect(response.status).not.toBe(404);
      });
    });
  });

  describe('Security headers', () => {
    it('should set X-Content-Type-Options header', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options header', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });

  describe('Content-Type handling', () => {
    it('should accept JSON requests', async () => {
      await request(app)
        .post('/api/auth/sign-up')
        .send({})
        .expect('Content-Type', /json/);
    });

    it('should return JSON for errors', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up')
        .send({});

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });
});
