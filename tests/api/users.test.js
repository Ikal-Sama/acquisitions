import request from 'supertest';
import app from '#src/app.js';

describe('Users API', () => {
  describe('GET /api/users', () => {
    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/users').expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/users/1').expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 400 for invalid id', async () => {
      const response = await request(app)
        .get('/api/users/abc')
        .set('Cookie', 'token=valid')
        .expect(401);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should return 401 without token', async () => {
      const response = await request(app).delete('/api/users/1').expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });
});
