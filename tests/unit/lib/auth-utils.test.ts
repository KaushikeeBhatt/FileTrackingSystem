import { hashPassword, verifyPassword, generateToken, verifyToken } from '@/lib/auth-utils';
import { setupTestDatabase, cleanTestDb } from '../../utils/test-helpers';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_jwt_token'),
  verify: jest.fn().mockReturnValue({ id: 'test-id', userId: 'test-user-id', email: 'test@example.com', name: 'Test User', role: 'user' }),
}));

describe('Auth Utils', () => {
  setupTestDatabase();

  beforeEach(async () => {
    await cleanTestDb();
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes';
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'testpassword123';
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBe('hashed_password');
      expect(require('bcryptjs').hash).toHaveBeenCalledWith(password, 12);
    });

    it('should handle empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow();
    });

    it('should handle null password', async () => {
      await expect(hashPassword(null as any)).rejects.toThrow();
    });
  });

  describe('verifyPassword', () => {
    it('should verify password successfully', async () => {
      const password = 'testpassword123';
      const hashedPassword = 'hashed_password';
      
      const isValid = await verifyPassword(password, hashedPassword);
      
      expect(isValid).toBe(true);
      expect(require('bcryptjs').compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should return false for invalid password', async () => {
      require('bcryptjs').compare.mockResolvedValueOnce(false);
      
      const password = 'wrongpassword';
      const hashedPassword = 'hashed_password';
      
      const isValid = await verifyPassword(password, hashedPassword);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty inputs', async () => {
      await expect(verifyPassword('', 'hash')).rejects.toThrow();
      await expect(verifyPassword('password', '')).rejects.toThrow();
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token successfully', () => {
      const payload = { id: 'test-id', userId: 'test-user-id', email: 'test@example.com', name: 'Test User', role: 'user' as const };
      
      const token = generateToken(payload);
      
      expect(token).toBe('mock_jwt_token');
      expect(require('jsonwebtoken').sign).toHaveBeenCalledWith(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
    });

    it('should throw error without JWT_SECRET', () => {
      const originalJwtSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = '';
      
      expect(() => generateToken({ id: 'test-id', userId: 'test', email: 'test@test.com', name: 'test', role: 'user' as const })).toThrow('JWT_SECRET');
      
      // Restore the original JWT_SECRET
      process.env.JWT_SECRET = originalJwtSecret;
    });
  });

  describe('verifyToken', () => {
    it('should verify JWT token successfully', () => {
      const token = 'valid_jwt_token';
      
      const payload = verifyToken(token);
      
      expect(payload).toEqual({ id: 'test-id', userId: 'test-user-id', email: 'test@example.com', name: 'Test User', role: 'user' });
      expect(require('jsonwebtoken').verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
    });

    it('should throw error for invalid token', () => {
      require('jsonwebtoken').verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });
      
      expect(() => verifyToken('invalid_token')).toThrow('Invalid token');
    });

    it('should throw error for expired token', () => {
      require('jsonwebtoken').verify.mockImplementationOnce(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });
      
      expect(() => verifyToken('expired_token')).toThrow('Token expired');
    });

    it('should handle empty token', () => {
      expect(() => verifyToken('')).toThrow();
      expect(() => verifyToken(null as any)).toThrow();
    });
  });
});
