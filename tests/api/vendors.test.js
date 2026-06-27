import request from 'supertest';
import app from '#src/app.js';

describe('Vendors API', () => {
  describe('GET /api/vendors', () => {
    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/vendors').expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('POST /api/vendors', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/vendors')
        .send({})
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });
});
