import request from 'supertest';
import app from '#src/app.js';

describe('Auth API', () => {
  describe('POST /api/auth/sign-up', () => {
    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('details');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up')
        .send({
          name: 'Test',
          email: 'not-an-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up')
        .send({
          name: 'Test',
          email: 'test@example.com',
          password: '123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 for short name', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up')
        .send({
          name: 'A',
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 for invalid role', async () => {
      const response = await request(app)
        .post('/api/auth/sign-up')
        .send({
          name: 'Test',
          email: 'test@example.com',
          password: 'password123',
          role: 'superadmin',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('POST /api/auth/sign-in', () => {
    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/sign-in')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/sign-in')
        .send({
          email: 'bad',
          password: 'password123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('POST /api/auth/sign-out', () => {
    it('should return 200 without auth', async () => {
      const response = await request(app)
        .post('/api/auth/sign-out')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'User signed out');
    });
  });
});
