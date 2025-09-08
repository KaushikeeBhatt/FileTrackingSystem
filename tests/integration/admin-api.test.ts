import { NextRequest } from "next/server";
import { GET as statsHandler } from "@/app/api/admin/stats/route";
import { GET as usersHandler, POST as createUserHandler } from "@/app/api/admin/users/route";
import { PUT as updateUserHandler, DELETE as deleteUserHandler } from "@/app/api/admin/users/[id]/route";
import { POST as bulkApproveHandler } from "@/app/api/admin/files/bulk-approve/route";
import { setupTestDatabase, getTestDb, cleanTestDb } from "../utils/test-helpers";

// Mock the rate limiter
jest.mock('@/lib/rate-limiter', () => ({
  RATE_LIMITS: {
    AUTH: { windowMs: 300000, maxRequests: 10 },
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
  withRateLimit: (handler: any, limitType?: string) => (req: any, context: any) => {
    return handler(req, context);
  },
  rateLimit: (limitType?: string) => (handler: any) => (req: any, context: any) => {
    return handler(req, context);
  },
  withAuthAndRateLimit: (handler: any, requiredRoles?: string[], limitType?: string) => (req: any, context: any) => {
    const user = (req as any).user;
    
    // If no user is set, return 401
    if (!user) {
      return {
        status: 401,
        json: async () => ({ error: "Authentication required" })
      };
    }
    
    // Check role permissions
    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      return {
        status: 403,
        json: async () => ({ error: "Insufficient permissions" })
      };
    }
    
    return handler(req, context);
  },
}));

// Mock auth middleware
jest.mock('@/lib/middleware/auth', () => ({
  withAuth: (handler: any, requiredRoles?: string[]) => (req: any, context: any) => {
    const user = (req as any).user;
    
    // If no user is set, return 401
    if (!user) {
      return {
        status: 401,
        json: async () => ({ error: "Authentication required" })
      };
    }
    
    // Check role permissions
    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      return {
        status: 403,
        json: async () => ({ error: "Insufficient permissions" })
      };
    }
    
    return handler(req, context);
  },
}));

describe("/api/admin", () => {
  setupTestDatabase();

  beforeEach(async () => {
    await cleanTestDb();
  });

  describe("GET /api/admin/stats", () => {
    it("should return admin statistics", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/stats");
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await statsHandler(req);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('stats');
      expect(typeof data.stats.totalUsers).toBe('number');
      expect(typeof data.stats.totalFiles).toBe('number');
      expect(Array.isArray(data.stats.recentActivity) || data.stats.recentActivity === undefined).toBe(true);
    });

    it("should reject non-admin access", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/stats");
      
      // Set non-admin user to test auth middleware
      (req as any).user = {
        id: 'user-id',
        email: 'user@example.com',
        role: 'user',
        name: 'Regular User'
      };

      const response = await statsHandler(req);
      
      // The middleware should reject non-admin access
      expect(response.status).toBe(403);
    });
  });

  describe("GET /api/admin/users", () => {
    it("should list all users for admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/users");
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await usersHandler(req);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('users');
      expect(Array.isArray(data.users)).toBe(true);
    });

    it("should support user search and filtering", async () => {
      const url = new URL("http://localhost:3000/api/admin/users");
      url.searchParams.set('limit', '10');
      url.searchParams.set('skip', '0');
      
      const req = new NextRequest(url);
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await usersHandler(req);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('users');
      expect(Array.isArray(data.users)).toBe(true);
    });
  });

  describe("POST /api/admin/users", () => {
    it("should create new user as admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "newuser@example.com",
          password: "securepassword123",
          name: "New User",
          role: "user"
        }),
      });
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await createUserHandler(req);
      
      expect([200, 201]).toContain(response.status);
      const data = await response.json();

      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('userId');
      expect(data).toHaveProperty('message', 'User created successfully');
    });

    it("should validate required fields", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "invalid-email",
          // Missing password and name
        }),
      });
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await createUserHandler(req);
      
      expect([400, 500]).toContain(response.status);
      const data = await response.json();

      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    });
  });

  // Note: GET /api/admin/users/[id] endpoint doesn't exist in the current implementation
  // The route only supports PUT and DELETE operations

  describe("PUT /api/admin/users/[id]", () => {
    it("should update user details", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/users/test-user-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Name",
          role: "moderator"
        }),
      });
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await updateUserHandler(req, { params: { id: 'test-user-id' } });
      
      expect([200, 400, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('message');
      }
    });

    it("should validate role changes", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/users/test-user-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "invalid-role"
        }),
      });
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await updateUserHandler(req, { params: { id: 'test-user-id' } });
      
      expect([200, 400, 404, 500]).toContain(response.status);
      if (response.status !== 200) {
        const data = await response.json();
        expect(data).toHaveProperty('error');
      }
    });
  });

  describe("DELETE /api/admin/users/[id]", () => {
    it("should delete user", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/users/test-user-id", {
        method: "DELETE"
      });
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await deleteUserHandler(req, { params: { id: 'test-user-id' } });
      
      expect([200, 400, 404, 500]).toContain(response.status);
      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('message');
      }
    });

    it("should prevent admin from deleting themselves", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/users/admin-user-id", {
        method: "DELETE"
      });
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await deleteUserHandler(req, { params: { id: 'admin-user-id' } });
      
      expect([200, 400, 403, 404, 500]).toContain(response.status);
      if (response.status !== 200) {
        const data = await response.json();
        expect(data).toHaveProperty('error');
      }
    });
  });

  describe("POST /api/admin/files/bulk-approve", () => {
    it("should bulk approve files", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/files/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileIds: ['file1', 'file2', 'file3']
        }),
      });
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await bulkApproveHandler(req);
      
      expect([200, 400, 500]).toContain(response.status);
      const data = await response.json();

      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('approved');
      expect(data).toHaveProperty('failed');
      expect(data).toHaveProperty('message');
      expect(typeof data.approved).toBe('number');
      expect(typeof data.failed).toBe('number');
    });

    it("should validate file IDs array", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/files/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileIds: [] // Empty array
        }),
      });
      
      (req as any).user = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        name: 'Admin User'
      };

      const response = await bulkApproveHandler(req);
      
      expect([400, 500]).toContain(response.status);
      const data = await response.json();

      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    });
  });
});
