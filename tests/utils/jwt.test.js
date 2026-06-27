import jwt from 'jsonwebtoken';
import { jwttoken } from '#utils/jwt.js';

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-please-change-me-in-production';

describe('jwttoken', () => {
  const payload = { id: 1, email: 'test@example.com', role: 'user' };

  describe('sign', () => {
    it('should sign a payload and return a token string', () => {
      const token = jwttoken.sign(payload);

      expect(token).toEqual(expect.any(String));
      expect(token.split('.')).toHaveLength(3);
    });

    it('should sign different payloads to different tokens', () => {
      const token1 = jwttoken.sign({ id: 1 });
      const token2 = jwttoken.sign({ id: 2 });

      expect(token1).not.toBe(token2);
    });
  });

  describe('verify', () => {
    it('should verify a valid token and return the payload', () => {
      const token = jwttoken.sign(payload);
      const decoded = jwttoken.verify(token);

      expect(decoded).toMatchObject({
        id: payload.id,
        email: payload.email,
        role: payload.role,
      });
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });

    it('should throw for an invalid token', () => {
      expect(() => jwttoken.verify('invalid-token')).toThrow(
        'Failed to verify token'
      );
    });

    it('should throw for a tampered token', () => {
      const token = jwttoken.sign(payload);
      const parts = token.split('.');
      const tampered = `${parts[0]}.${parts[1]}.tampered`;

      expect(() => jwttoken.verify(tampered)).toThrow('Failed to verify token');
    });

    it('should throw for an expired token', () => {
      const expired = jwt.sign(payload, JWT_SECRET, { expiresIn: '0s' });

      expect(() => jwttoken.verify(expired)).toThrow('Failed to verify token');
    });
  });
});
