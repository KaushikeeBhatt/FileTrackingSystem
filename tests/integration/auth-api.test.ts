import { NextRequest } from "next/server";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { setupTestDatabase, getTestDb } from "../utils/test-helpers";

// Mock the rate limiter to avoid rate limiting in tests
jest.mock('@/lib/rate-limiter', () => ({
  RATE_LIMITS: {
    AUTH: {
      windowMs: 300000,
      maxRequests: 10,
    },
    GENERAL: {
      windowMs: 60000,
      maxRequests: 100,
    },
  },
  checkRateLimit: jest.fn().mockResolvedValue({
    allowed: true,
    remaining: 10,
    resetTime: Date.now() + 300000,
  }),
  defaultKeyGenerator: jest.fn().mockReturnValue('test-key'),
  roleBasedKeyGenerator: jest.fn().mockReturnValue('test-key'),
  rateLimiter: {
    consume: jest.fn().mockResolvedValue(true),
  },
}));

// Mock the rate limit middleware to bypass rate limiting in tests
jest.mock('@/lib/middleware/rate-limit', () => ({
  withRateLimit: (handler: any, limitType?: any) => handler,
  rateLimit: (limitType?: any) => (handler: any) => handler,
  withAuthAndRateLimit: (handler: any, requiredRoles?: any, limitType?: any) => handler,
}));

describe("/api/auth", () => {
  // Set up test database before all tests
  setupTestDatabase();

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
          name: "Test User",
        }),
      });

      const response = await registerHandler(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe("test@example.com");
      expect(data.user.name).toBe("Test User");
      expect(data.user.password).toBeUndefined();
      expect(data.token).toBeDefined();
    });

    it("should reject registration with existing email", async () => {
      // First registration
      const firstReq = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "duplicate@example.com",
          password: "password123",
          name: "First User",
        }),
      });

      await registerHandler(firstReq);

      // Second registration with same email
      const secondReq = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "duplicate@example.com",
          password: "password456",
          name: "Second User",
        }),
      });

      const response = await registerHandler(secondReq);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("User already exists");
    });
  });

  describe("POST /api/auth/login", () => {
    const testUser = {
      email: "login@example.com",
      password: "testpassword",
      name: "Test Login User"
    };

    beforeEach(async () => {
      // Register a test user before login tests
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testUser),
      });
      await registerHandler(req);
    });

    it("should login with valid credentials", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      const response = await loginHandler(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
      expect(data.token).toBeDefined();
    });

    it("should reject login with invalid password", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: "wrongpassword",
        }),
      });

      const response = await loginHandler(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid credentials");
    });

    it("should reject login with non-existent email", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nonexistent@example.com",
          password: "anypassword",
        }),
      });

      const response = await loginHandler(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid credentials");
    });
  });
});
