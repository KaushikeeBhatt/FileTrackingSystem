// Unmock the rate-limiter to test actual implementation
jest.unmock('@/lib/rate-limiter');

import { 
  RATE_LIMITS,
  defaultKeyGenerator,
  roleBasedKeyGenerator,
  checkRateLimit
} from '@/lib/rate-limiter';
import { setupTestDatabase, cleanTestDb } from '../../utils/test-helpers';
import { NextRequest } from 'next/server';

// No Redis mocking needed since we're using in-memory storage

// Helper to create a mock NextRequest
const createMockRequest = (headers: Record<string, string>, connection?: any, user?: any): NextRequest => {
  const req = new NextRequest(new URL('http://localhost'), {
    headers,
  });

  // Mocking properties that are not available in the minimal constructor
  Object.defineProperty(req, 'connection', {
    value: connection,
    writable: true,
  });

  Object.defineProperty(req, 'user', {
    value: user,
    writable: true,
  });

  return req;
};

describe('Rate Limiter', () => {
  setupTestDatabase();

  beforeEach(async () => {
    await cleanTestDb();
    jest.clearAllMocks();
  });

  describe('RATE_LIMITS configuration', () => {
    it('should have defined rate limits', () => {
      expect(RATE_LIMITS.AUTH).toBeDefined();
      expect(RATE_LIMITS.GENERAL).toBeDefined();
      expect(RATE_LIMITS.UPLOAD).toBeDefined();
      expect(RATE_LIMITS.SEARCH).toBeDefined();
      expect(RATE_LIMITS.ADMIN).toBeDefined();
      expect(RATE_LIMITS.PUBLIC).toBeDefined();
    });

    it('should have valid rate limit values', () => {
      Object.values(RATE_LIMITS).forEach(limit => {
        expect(limit.windowMs).toBeGreaterThan(0);
        expect(limit.maxRequests).toBeGreaterThan(0);
      });
    });
  });

  describe('defaultKeyGenerator', () => {
    it('should generate key from IP address', () => {
      const mockReq = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const key = defaultKeyGenerator(mockReq);
      expect(key).toBe('ip:192.168.1.1');
    });

    it('should handle multiple forwarded IPs', () => {
      const mockReq = createMockRequest({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1' });
      const key = defaultKeyGenerator(mockReq);
      expect(key).toBe('ip:192.168.1.1');
    });

    it('should use user ID when available', () => {
      const mockReq = createMockRequest({}, {}, { id: 'user123' });
      const key = defaultKeyGenerator(mockReq);
      expect(key).toBe('user:user123');
    });

    it('should use default when no address available', () => {
      const mockReq = createMockRequest({}, {});
      const key = defaultKeyGenerator(mockReq);
      expect(key).toBe('ip:unknown');
    });
  });

  describe('roleBasedKeyGenerator', () => {
    it('should generate key with user ID and role', () => {
      const mockReq = createMockRequest(
        { 'x-forwarded-for': '192.168.1.1' },
        {},
        { id: 'user123', role: 'admin' }
      );
      const key = roleBasedKeyGenerator(mockReq);
      expect(key).toBe('admin:user123:ip:192.168.1.1');
    });

    it('should use default role when no role specified', () => {
      const mockReq = createMockRequest(
        { 'x-forwarded-for': '192.168.1.1' },
        {},
        { id: 'user123' }
      );
      const key = roleBasedKeyGenerator(mockReq);
      expect(key).toBe('user:user123:ip:192.168.1.1');
    });

    it('should fallback to IP when no user', () => {
      const mockReq = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const key = roleBasedKeyGenerator(mockReq);
      expect(key).toBe('ip:192.168.1.1');
    });
  });

  describe('checkRateLimit', () => {
    it('should return rate limit result structure', async () => {
      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const limit = RATE_LIMITS.GENERAL;
      
      const result = await checkRateLimit(req, limit);
      
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('resetTime');
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.remaining).toBe('number');
      expect(typeof result.resetTime).toBe('number');
    });

    it('should work with different rate limit configurations', async () => {
      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      
      const authResult = await checkRateLimit(req, RATE_LIMITS.AUTH);
      expect(authResult.allowed).toBeDefined();
      
      const adminResult = await checkRateLimit(req, RATE_LIMITS.ADMIN);
      expect(adminResult.allowed).toBeDefined();
      
      const searchResult = await checkRateLimit(req, RATE_LIMITS.SEARCH);
      expect(searchResult.allowed).toBeDefined();
    });

    it('should handle requests with user context', async () => {
      const req = createMockRequest({}, {}, { id: 'user123' });
      const limit = RATE_LIMITS.GENERAL;
      
      const result = await checkRateLimit(req, limit);
      
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('resetTime');
    });
  });
});
