import request from 'supertest';
import app from '#src/app.js';

describe('Audit Logs API', () => {
  describe('GET /api/audit-logs', () => {
    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/audit-logs').expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('GET /api/audit-logs/:id', () => {
    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/audit-logs/1').expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });
});
