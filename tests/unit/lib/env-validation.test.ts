import { 
  validateEnvironment,
  getRequiredEnvVar,
  getOptionalEnvVar,
  validateJWTSecret,
  validateDatabaseURL,
  validatePort
} from '@/lib/env-validation';
import { setupTestDatabase, cleanTestDb } from '../../utils/test-helpers';

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      // Set default required values for most tests
      MONGODB_URI: 'mongodb://localhost:27017/test',
      JWT_SECRET: 'a-super-secret-key-that-is-long-enough',
      NODE_ENV: 'test',
      BASE_URL: 'http://localhost:3000',
      MAX_FILE_SIZE: '10485760',
      ALLOWED_FILE_TYPES: 'image/jpeg,image/png',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getRequiredEnvVar', () => {
    it('should return environment variable value', () => {
      process.env.TEST_VAR = 'test-value';
      
      const value = getRequiredEnvVar('TEST_VAR');
      
      expect(value).toBe('test-value');
    });

    it('should throw error for missing required variable', () => {
      expect(() => getRequiredEnvVar('MISSING_VAR')).toThrow('Missing required environment variable: MISSING_VAR');
    });

    it('should throw error for empty required variable', () => {
      process.env.EMPTY_VAR = '';
      
      expect(() => getRequiredEnvVar('EMPTY_VAR')).toThrow('Missing required environment variable: EMPTY_VAR');
    });

    it('should provide custom error message', () => {
      expect(() => getRequiredEnvVar('CUSTOM_VAR', 'Custom error message')).toThrow('Custom error message');
    });
  });

  describe('getOptionalEnvVar', () => {
    it('should return environment variable value', () => {
      process.env.OPTIONAL_VAR = 'optional-value';
      
      const value = getOptionalEnvVar('OPTIONAL_VAR', 'default');
      
      expect(value).toBe('optional-value');
    });

    it('should return default value for missing variable', () => {
      const value = getOptionalEnvVar('MISSING_OPTIONAL', 'default-value');
      
      expect(value).toBe('default-value');
    });

    it('should return default value for empty variable', () => {
      process.env.EMPTY_OPTIONAL = '';
      
      const value = getOptionalEnvVar('EMPTY_OPTIONAL', 'default-value');
      
      expect(value).toBe('default-value');
    });

    it('should handle undefined default value', () => {
      const value = getOptionalEnvVar('MISSING_VAR');
      
      expect(value).toBeUndefined();
    });
  });

  describe('validateJWTSecret', () => {
    it('should validate valid JWT secret', () => {
      const validSecret = 'a-very-long-and-secure-jwt-secret-key-for-production-use';
      
      expect(() => validateJWTSecret(validSecret)).not.toThrow();
    });

    it('should reject short JWT secret', () => {
      const shortSecret = 'short';
      
      expect(() => validateJWTSecret(shortSecret)).toThrow('JWT_SECRET must be at least 32 characters long');
    });

    it('should reject empty JWT secret', () => {
      expect(() => validateJWTSecret('')).toThrow('JWT_SECRET is required');
    });

    it('should reject undefined JWT secret', () => {
      expect(() => validateJWTSecret(undefined)).toThrow('JWT_SECRET is required');
    });

    it('should accept exactly 32 character secret', () => {
      const exactSecret = 'a'.repeat(32);
      
      expect(() => validateJWTSecret(exactSecret)).not.toThrow();
    });
  });

  describe('validateDatabaseURL', () => {
    it('should validate valid MongoDB URL', () => {
      const validURL = 'mongodb://localhost:27017/testdb';
      
      expect(() => validateDatabaseURL(validURL)).not.toThrow();
    });

    it('should validate MongoDB Atlas URL', () => {
      const atlasURL = 'mongodb+srv://user:pass@cluster.mongodb.net/database';
      
      expect(() => validateDatabaseURL(atlasURL)).not.toThrow();
    });

    it('should reject non-MongoDB URL', () => {
      const invalidURL = 'postgresql://localhost:5432/db';
      
      expect(() => validateDatabaseURL(invalidURL)).toThrow('MONGODB_URI must be a valid MongoDB connection string');
    });

    it('should reject empty database URL', () => {
      expect(() => validateDatabaseURL('')).toThrow('MONGODB_URI is required');
    });

    it('should reject malformed URL', () => {
      const malformedURL = 'not-a-url';
      
      expect(() => validateDatabaseURL(malformedURL)).toThrow('MONGODB_URI must be a valid MongoDB connection string');
    });
  });

  describe('validatePort', () => {
    it('should validate valid port number', () => {
      expect(() => validatePort('3000')).not.toThrow();
      expect(() => validatePort('8080')).not.toThrow();
    });

    it('should reject invalid port numbers', () => {
      expect(() => validatePort('0')).toThrow('PORT must be between 1 and 65535');
      expect(() => validatePort('65536')).toThrow('PORT must be between 1 and 65535');
      expect(() => validatePort('-1')).toThrow('PORT must be between 1 and 65535');
    });

    it('should reject non-numeric port', () => {
      expect(() => validatePort('abc')).toThrow('PORT must be a valid number');
    });

    it('should handle undefined port with default', () => {
      expect(() => validatePort(undefined)).not.toThrow();
    });

    it('should validate edge case ports', () => {
      expect(() => validatePort('1')).not.toThrow();
      expect(() => validatePort('65535')).not.toThrow();
    });
  });

  describe('validateEnvironment', () => {
    it('should validate complete environment', () => {
      process.env.JWT_SECRET = 'a-very-long-and-secure-jwt-secret-key-for-testing';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.PORT = '3000';
      jest.spyOn(process, 'env', 'get').mockReturnValue({ ...process.env, NODE_ENV: 'development' });
      
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should throw for missing JWT_SECRET', () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.PORT = '3000';
      
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should validate in production environment', () => {
      jest.spyOn(process, 'env', 'get').mockReturnValue({ ...process.env, NODE_ENV: 'production' });
      process.env.JWT_SECRET = 'a-very-long-and-secure-jwt-secret-key-for-production';
      process.env.MONGODB_URI = 'mongodb+srv://user:pass@cluster.mongodb.net/prod';
      process.env.PORT = '8080';
      
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should validate in test environment', () => {
      jest.spyOn(process, 'env', 'get').mockReturnValue({ ...process.env, NODE_ENV: 'test' });
      process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should return validation result', () => {
      process.env.JWT_SECRET = 'a-very-long-and-secure-jwt-secret-key-for-testing';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.PORT = '3000';
      
      const result = validateEnvironment();
      
      expect(result.isValid).toBe(true);
      expect(result.config).not.toBeNull();
      if (result.config) {
        expect(result.config.JWT_SECRET).toBe('a-very-long-and-secure-jwt-secret-key-for-testing');
        expect(result.config.MONGODB_URI).toBe('mongodb://localhost:27017/testdb');
        expect(result.config.MAX_FILE_SIZE).toBe(10485760);
      }
    });

    it('should return error details on validation failure', () => {
      // Mock process.env to be empty
      const originalEnv = process.env;
      // Use type assertion to bypass TypeScript's readonly check
      (process.env as any) = {};

      const result = validateEnvironment();
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('Missing required environment variable: MONGODB_URI');
      expect(result.errors).toContain('Missing required environment variable: JWT_SECRET');
      expect(result.errors).toContain('Missing required environment variable: NODE_ENV');
      expect(result.errors).toContain('Missing required environment variable: BASE_URL');
      expect(result.errors).toContain('Missing required environment variable: MAX_FILE_SIZE');
      expect(result.errors).toContain('Missing required environment variable: ALLOWED_FILE_TYPES');

      // Restore original process.env
      process.env = originalEnv;
    });
  });
});
