import { 
  checkRateLimit,
  defaultKeyGenerator,
  roleBasedKeyGenerator,
  RATE_LIMITS
} from '@/lib/rate-limiter';
import { setupTestDatabase, cleanTestDb } from '../../utils/test-helpers';
import { NextRequest } from 'next/server';

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

// Mock Redis/memory store
const mockStore = new Map();
const mockRedis = {
  get: jest.fn((key) => Promise.resolve(mockStore.get(key))),
  set: jest.fn((key, value, options) => {
    mockStore.set(key, value);
    return Promise.resolve('OK');
  }),
  incr: jest.fn((key) => {
    const current = mockStore.get(key) || 0;
    const newValue = current + 1;
    mockStore.set(key, newValue);
    return Promise.resolve(newValue);
  }),
  expire: jest.fn(() => Promise.resolve(1)),
  ttl: jest.fn(() => Promise.resolve(300)),
  connect: jest.fn()
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    get: mockRedis.get,
    set: mockRedis.set,
    incr: mockRedis.incr,
    expire: mockRedis.expire,
    ttl: mockRedis.ttl,
    connect: mockRedis.connect
  })),
}));

describe('Rate Limiter', () => {
  setupTestDatabase();

  beforeEach(async () => {
    await cleanTestDb();
    mockStore.clear();
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
    it('should allow requests within limit', async () => {
      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const limit = RATE_LIMITS.GENERAL;
      
      mockRedis.get.mockResolvedValue('5');
      mockRedis.ttl.mockResolvedValue(300);
      
      const result = await checkRateLimit(req, limit);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(94); // 100 - 5 - 1
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should reject requests exceeding limit', async () => {
      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const limit = RATE_LIMITS.GENERAL;
      
      mockRedis.get.mockResolvedValue(limit.maxRequests.toString());
      mockRedis.ttl.mockResolvedValue(300);
      
      const result = await checkRateLimit(req, limit);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should initialize counter for new key', async () => {
      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const limit = RATE_LIMITS.GENERAL;
      
      mockRedis.get.mockResolvedValue(null);
      mockRedis.incr.mockResolvedValue(1);
      
      const result = await checkRateLimit(req, limit);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1
      expect(mockRedis.set).toHaveBeenCalledWith(
        'rate_limit:ip:192.168.1.1',
        '1'
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'rate_limit:ip:192.168.1.1',
        Math.ceil(limit.windowMs / 1000)
      );
    });

    it('should handle Redis errors gracefully', async () => {
      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const limit = RATE_LIMITS.GENERAL;
      
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      
      const result = await checkRateLimit(req, limit);
      
      // Should fail open and allow the request
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(limit.maxRequests);
    });

    it('should handle different rate limit types', async () => {
      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      
      // Test with AUTH limits
      // Test AUTH limits
      mockRedis.get.mockResolvedValue('5');
      const authResult = await checkRateLimit(req, RATE_LIMITS.AUTH);
      expect(authResult.remaining).toBe(RATE_LIMITS.AUTH.maxRequests - 6);
      
      // Test ADMIN limits
      const adminResult = await checkRateLimit(req, RATE_LIMITS.ADMIN);
      expect(adminResult.remaining).toBe(RATE_LIMITS.ADMIN.maxRequests - 6);
    });

    it('should increment counter on each call', async () => {
      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const limit = RATE_LIMITS.GENERAL;
      
      mockRedis.get.mockResolvedValue('0');
      mockRedis.incr.mockResolvedValue(1);
      
      await checkRateLimit(req, limit);
      
      expect(mockRedis.incr).toHaveBeenCalledWith('192.168.1.1');
    });

    it('should handle edge case at exact limit', async () => {
      const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1' });
      const limit = RATE_LIMITS.SEARCH;
      
      mockRedis.get.mockResolvedValue((limit.maxRequests - 1).toString());
      mockRedis.incr.mockResolvedValue(limit.maxRequests);
      
      const result = await checkRateLimit(req, limit);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });
  });
});
