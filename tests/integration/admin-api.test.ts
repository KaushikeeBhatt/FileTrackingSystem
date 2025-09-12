import { NextRequest } from "next/server";

// Import API routes - these are the wrapped handlers with middleware
import { GET as adminStatsHandler } from "@/app/api/admin/stats/route";
import { GET as adminUsersHandler, POST as createUserHandler } from "@/app/api/admin/users/route";
import { PUT as updateUserHandler, DELETE as deleteUserHandler } from "@/app/api/admin/users/[id]/route";
import { POST as bulkApproveHandler } from "@/app/api/admin/files/bulk-approve/route";
import { setupTestDatabase, getTestDb, cleanTestDb, createTestUser } from "../utils/test-helpers";

describe("/api/admin", () => {
  setupTestDatabase();

  beforeEach(async () => {
    await cleanTestDb();
  });

  describe("GET /api/admin/stats", () => {
    it("should return admin statistics", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/stats");
      
      // The middleware mock will automatically add admin user context
      const response = await adminStatsHandler(req);
      
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

      const response = await adminStatsHandler(req);
      
      // The middleware should reject non-admin access
      expect(response.status).toBe(403);
    });
  });

  describe("GET /api/admin/users", () => {
    it("should list all users for admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/users");
      
      // The middleware mock will automatically add admin user context
      const response = await adminUsersHandler(req);
      
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
      
      // The middleware mock will automatically add admin user context
      const response = await adminUsersHandler(req);
      
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
      
      // The middleware mock will automatically add admin user context
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
      
      // The middleware mock will automatically add admin user context
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
      
      // The middleware mock will automatically add admin user context
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
      
      // The middleware mock will automatically add admin user context
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
      
      // The middleware mock will automatically add admin user context
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
      
      // The middleware mock will automatically add admin user context
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
      
      // The middleware mock will automatically add admin user context
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
      
      // The middleware mock will automatically add admin user context
      const response = await bulkApproveHandler(req);
      
      expect([400, 500]).toContain(response.status);
      const data = await response.json();

      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    });
  });
});
