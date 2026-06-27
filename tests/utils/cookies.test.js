import { jest } from '@jest/globals';
import { cookies } from '#utils/cookies.js';

describe('cookies', () => {
  let mockRes;
  let mockReq;

  beforeEach(() => {
    mockRes = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    mockReq = {
      cookies: {},
    };
  });

  describe('getOptions', () => {
    it('should return default options with httpOnly and sameSite strict', () => {
      const opts = cookies.getOptions();

      expect(opts).toMatchObject({
        httpOnly: true,
        sameSite: 'strict',
      });
      expect(opts).toHaveProperty('maxAge');
    });

    it('should set secure flag in production', () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const opts = cookies.getOptions();

      expect(opts.secure).toBe(true);

      process.env.NODE_ENV = origEnv;
    });

    it('should not set secure flag in development', () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const opts = cookies.getOptions();

      expect(opts.secure).toBe(false);

      process.env.NODE_ENV = origEnv;
    });
  });

  describe('set', () => {
    it('should call res.cookie with name, value, and options', () => {
      cookies.set(mockRes, 'token', 'abc123');

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'token',
        'abc123',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
        })
      );
    });

    it('should merge custom options with defaults', () => {
      cookies.set(mockRes, 'token', 'abc123', { maxAge: 999 });

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'token',
        'abc123',
        expect.objectContaining({
          httpOnly: true,
          maxAge: 999,
        })
      );
    });
  });

  describe('clear', () => {
    it('should call res.clearCookie with name and options', () => {
      cookies.clear(mockRes, 'token');

      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
        })
      );
    });
  });

  describe('get', () => {
    it('should return the cookie value from req.cookies', () => {
      mockReq.cookies.token = 'abc123';

      const result = cookies.get(mockReq, 'token');

      expect(result).toBe('abc123');
    });

    it('should return undefined for missing cookie', () => {
      const result = cookies.get(mockReq, 'nonexistent');

      expect(result).toBeUndefined();
    });
  });
});
