import request from 'supertest';
import app from '#src/app.js';

describe('Analytics API', () => {
  describe('Authentication', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/analytics/summary')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/analytics/summary')
        .set('Cookie', 'token=invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty(
        'error',
        'Invalid or expired token'
      );
    });
  });

  describe('Endpoint structure', () => {
    const endpoints = [
      '/api/analytics/summary',
      '/api/analytics/spend-by-department',
      '/api/analytics/spend-by-vendor',
      '/api/analytics/budget-utilization',
    ];

    endpoints.forEach(endpoint => {
      it(`${endpoint} should exist (returns 401 or 200)`, async () => {
        const response = await request(app).get(endpoint);

        expect([401, 200]).toContain(response.status);
      });
    });
  });
});
