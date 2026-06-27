import request from 'supertest';
import app from '#src/app.js';

describe('Departments API', () => {
  describe('GET /api/departments', () => {
    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/departments').expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('POST /api/departments', () => {
    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/departments')
        .send({})
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });
});
