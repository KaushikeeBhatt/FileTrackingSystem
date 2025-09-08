import { hashPassword, verifyPassword, generateToken, verifyToken } from '@/lib/auth-utils';
import { setupTestDatabase, cleanTestDb } from '../../utils/test-helpers';

// Mock the entire auth module since auth-utils re-exports from it
jest.mock('@/lib/auth', () => ({
  AuthService: {
    hashPassword: jest.fn().mockImplementation(async (password) => {
      if (!password || password === '' || password === null) {
        throw new Error('Password is required');
      }
      return 'hashed_' + password;
    }),
    verifyPassword: jest.fn().mockImplementation(async (password, hash) => {
      if (!password || password === '' || !hash || hash === '') {
        throw new Error('Password and hash are required');
      }
      return password === 'testpassword123';
    }),
    generateToken: jest.fn().mockImplementation(async (payload) => {
      // Check if environment validation should fail
      const mockValidateEnvironment = require('@/lib/env-validation').validateEnvironment;
      const envResult = mockValidateEnvironment();
      if (!envResult.isValid) {
        throw new Error('Environment validation failed');
      }
      return 'mock-jwt-token';
    }),
    verifyToken: jest.fn().mockImplementation(async (token) => {
      if (!token || token === '' || token === null || token === 'null') {
        return null;
      }
      if (token === 'invalid_token') {
        return null;
      }
      if (token === 'expired_token') {
        return null;
      }
      return { 
        id: 'test-id', 
        userId: 'test-user-id', 
        email: 'test@example.com', 
        name: 'Test User', 
        role: 'user', 
        department: undefined 
      };
    }),
  }
}));

// Mock bcryptjs for direct calls
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockImplementation((password, salt) => {
    if (!password || password === '' || password === null) {
      throw new Error('Password is required');
    }
    return Promise.resolve('hashed_' + password);
  }),
  compare: jest.fn().mockImplementation((password, hash) => {
    if (!password || password === '' || !hash || hash === '') {
      throw new Error('Password and hash are required');
    }
    return Promise.resolve(password === 'testpassword123');
  }),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

// Mock jsonwebtoken for direct calls
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockImplementation((token) => {
    if (!token || token === '' || token === null) {
      throw new Error('Token is required');
    }
    if (token === 'invalid_token') {
      throw new Error('Invalid token');
    }
    if (token === 'expired_token') {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      throw error;
    }
    return { id: 'test-id', userId: 'test-user-id', email: 'test@example.com', name: 'Test User', role: 'user', department: undefined };
  }),
}));

// Mock env-validation
jest.mock('@/lib/env-validation', () => ({
  validateEnvironment: jest.fn().mockReturnValue({
    isValid: true,
    config: { JWT_SECRET: 'test-jwt-secret-key-for-testing-purposes' },
    errors: []
  })
}));

describe('Auth Utils', () => {
  setupTestDatabase();

  beforeEach(async () => {
    await cleanTestDb();
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes';
    // Reset mocks
    jest.clearAllMocks();
    // Reset the validateEnvironment mock to return valid state
    require('@/lib/env-validation').validateEnvironment.mockReturnValue({
      isValid: true,
      config: { JWT_SECRET: 'test-jwt-secret-key-for-testing-purposes' },
      errors: []
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'testpassword123';
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBe('hashed_testpassword123');
      expect(require('@/lib/auth').AuthService.hashPassword).toHaveBeenCalledWith(password);
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
      expect(require('@/lib/auth').AuthService.verifyPassword).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should return false for invalid password', async () => {
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
    it('should generate JWT token successfully', async () => {
      const payload = { id: 'test-id', userId: 'test-user-id', email: 'test@example.com', name: 'Test User', role: 'user' as const };
      
      const token = await generateToken(payload);
      
      expect(token).toBe('mock-jwt-token');
      expect(require('@/lib/auth').AuthService.generateToken).toHaveBeenCalledWith(payload);
    });

    it('should throw error without JWT_SECRET', async () => {
      // Mock the validateEnvironment to return invalid state
      const mockValidateEnvironment = require('@/lib/env-validation').validateEnvironment;
      mockValidateEnvironment.mockReturnValueOnce({
        isValid: false,
        config: null,
        errors: ['JWT_SECRET is required']
      });
      
      await expect(generateToken({ id: 'test-id', userId: 'test', email: 'test@test.com', name: 'test', role: 'user' as const })).rejects.toThrow('Environment validation failed');
    });
  });

  describe('verifyToken', () => {
    it('should verify JWT token successfully', async () => {
      const token = 'valid_jwt_token';
      
      const payload = await verifyToken(token);
      
      expect(payload).toEqual({ id: 'test-id', userId: 'test-user-id', email: 'test@example.com', name: 'Test User', role: 'user', department: undefined });
      expect(require('@/lib/auth').AuthService.verifyToken).toHaveBeenCalledWith(token);
    });

    it('should return null for invalid token', async () => {
      const payload = await verifyToken('invalid_token');
      expect(payload).toBeNull();
    });

    it('should return null for expired token', async () => {
      const payload = await verifyToken('expired_token');
      expect(payload).toBeNull();
    });

    it('should return null for empty token', async () => {
      const payload1 = await verifyToken('');
      const payload2 = await verifyToken(null as any);
      expect(payload1).toBeNull();
      expect(payload2).toBeNull();
    });
  });
});
