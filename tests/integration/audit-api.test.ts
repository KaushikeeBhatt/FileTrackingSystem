import { NextRequest } from "next/server";
import { GET as auditLogsHandler } from "@/app/api/audit/logs/route";
import { GET as auditStatsHandler } from "@/app/api/audit/stats/route";
import { GET as auditExportHandler } from "@/app/api/audit/export/route";
import { setupTestDatabase, getTestDb, cleanTestDb } from "../utils/test-helpers";

// Mock the rate limiter
jest.mock('@/lib/rate-limiter', () => ({
  RATE_LIMITS: {
    GENERAL: { windowMs: 60000, maxRequests: 100 },
    ADMIN: { windowMs: 60000, maxRequests: 50 },
  },
  checkRateLimit: jest.fn().mockResolvedValue({
    allowed: true,
    remaining: 10,
    resetTime: Date.now() + 300000,
  }),
  defaultKeyGenerator: jest.fn().mockReturnValue('test-key'),
  roleBasedKeyGenerator: jest.fn().mockReturnValue('test-key'),
  rateLimiter: { consume: jest.fn().mockResolvedValue(true) },
}));

// Mock rate limit middleware
jest.mock('@/lib/middleware/rate-limit', () => ({
  withRateLimit: (handler: any) => handler,
  rateLimit: () => (handler: any) => handler,
  withAuthAndRateLimit: (handler: any) => handler,
}));

// Mock auth middleware
jest.mock('@/lib/middleware/auth', () => ({
  withAuth: (handler: any) => (req: any, context: any) => {
    (req as any).user = {
      id: 'admin-user-id',
      email: 'admin@example.com',
      role: 'admin',
      name: 'Admin User'
    };
    return handler(req, context);
  },
  withAuthAndRole: (handler: any, roles: string[]) => (req: any, context: any) => {
    (req as any).user = {
      id: 'admin-user-id',
      email: 'admin@example.com',
      role: roles.includes('admin') ? 'admin' : 'user',
      name: 'Admin User'
    };
    return handler(req, context);
  },
}));

describe("/api/audit", () => {
  setupTestDatabase();

  beforeEach(async () => {
    await cleanTestDb();
  });

  describe("GET /api/audit/logs", () => {
    it("should return audit logs for admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/audit/logs");
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await auditLogsHandler(req);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.logs)).toBe(true);
      expect(data.pagination).toBeDefined();
    });

    it("should support filtering by action type", async () => {
      const url = new URL("http://localhost:3000/api/audit/logs");
      url.searchParams.set('action', 'file_upload');
      url.searchParams.set('page', '1');
      url.searchParams.set('limit', '20');
      
      const req = new NextRequest(url);
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await auditLogsHandler(req);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.logs)).toBe(true);
    });

    it("should support filtering by user", async () => {
      const url = new URL("http://localhost:3000/api/audit/logs");
      url.searchParams.set('userId', 'test-user-id');
      url.searchParams.set('startDate', '2024-01-01');
      url.searchParams.set('endDate', '2024-12-31');
      
      const req = new NextRequest(url);
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await auditLogsHandler(req);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.filters).toBeDefined();
    });

    it("should reject non-admin access", async () => {
      const req = new NextRequest("http://localhost:3000/api/audit/logs");
      
      (req as any).user = {
        id: 'user-id',
        email: 'user@example.com',
        role: 'user',
        name: 'Regular User'
      };

      const response = await auditLogsHandler(req);
      
      expect(response.status).toBe(403);
    });
  });

  describe("GET /api/audit/stats", () => {
    it("should return audit statistics", async () => {
      const req = new NextRequest("http://localhost:3000/api/audit/stats");
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await auditStatsHandler(req);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(typeof data.stats.totalLogs).toBe('number');
      expect(Array.isArray(data.stats.actionBreakdown)).toBe(true);
      expect(Array.isArray(data.stats.dailyActivity)).toBe(true);
    });

    it("should support date range for stats", async () => {
      const url = new URL("http://localhost:3000/api/audit/stats");
      url.searchParams.set('startDate', '2024-01-01');
      url.searchParams.set('endDate', '2024-01-31');
      
      const req = new NextRequest(url);
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await auditStatsHandler(req);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.dateRange).toBeDefined();
    });
  });

  describe("GET /api/audit/export", () => {
    it("should export audit logs as CSV", async () => {
      const url = new URL("http://localhost:3000/api/audit/export");
      url.searchParams.set('format', 'csv');
      
      const req = new NextRequest(url);
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await auditExportHandler(req);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/csv');
    });

    it("should export audit logs as JSON", async () => {
      const url = new URL("http://localhost:3000/api/audit/export");
      url.searchParams.set('format', 'json');
      url.searchParams.set('startDate', '2024-01-01');
      url.searchParams.set('endDate', '2024-12-31');
      
      const req = new NextRequest(url);
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await auditExportHandler(req);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
    });

    it("should validate export parameters", async () => {
      const url = new URL("http://localhost:3000/api/audit/export");
      url.searchParams.set('format', 'invalid');
      
      const req = new NextRequest(url);
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await auditExportHandler(req);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('format');
    });

    it("should reject non-admin export access", async () => {
      const req = new NextRequest("http://localhost:3000/api/audit/export");
      
      (req as any).user = {
        id: 'user-id',
        email: 'user@example.com',
        role: 'user',
        name: 'Regular User'
      };

      const response = await auditExportHandler(req);
      
      expect(response.status).toBe(403);
    });
  });
});
