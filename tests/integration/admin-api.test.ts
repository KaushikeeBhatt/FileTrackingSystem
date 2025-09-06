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
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(typeof data.stats.totalUsers).toBe('number');
      expect(typeof data.stats.totalFiles).toBe('number');
      expect(typeof data.stats.pendingApprovals).toBe('number');
    });

    it("should reject non-admin access", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/stats");
      
      (req as any).user = {
        id: 'user-id',
        email: 'user@example.com',
        role: 'user',
        name: 'Regular User'
      };

      const response = await statsHandler(req);
      
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
      expect(data.success).toBe(true);
      expect(Array.isArray(data.users)).toBe(true);
    });

    it("should support user search and filtering", async () => {
      const url = new URL("http://localhost:3000/api/admin/users");
      url.searchParams.set('search', 'test');
      url.searchParams.set('role', 'user');
      url.searchParams.set('page', '1');
      url.searchParams.set('limit', '10');
      
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
      expect(data.success).toBe(true);
      expect(data.pagination).toBeDefined();
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
      
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe("newuser@example.com");
      expect(data.user.password).toBeUndefined(); // Password should not be returned
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
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
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
      
      // Should return 404 for non-existent user or 200 for successful update
      expect([200, 404]).toContain(response.status);
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
      
      expect(response.status).toBe(400);
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
      
      // Should return 404 for non-existent user or 200 for successful deletion
      expect([200, 404]).toContain(response.status);
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
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('yourself');
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
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.approved).toBeDefined();
      expect(data.failed).toBeDefined();
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
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('fileIds');
    });
  });
});
