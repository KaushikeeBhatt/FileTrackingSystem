import { NextRequest } from "next/server"
import { MongoClient, Db } from 'mongodb';
import { POST as loginHandler } from "@/app/api/auth/login/route"
import { POST as registerHandler } from "@/app/api/auth/register/route"
import { setupTestDatabase, cleanupTestDatabase } from "../utils/test-helpers"

describe("/api/auth", () => {
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    client = setup.client;
    db = setup.db;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
          name: "Test User"
        }),
      });

      const response = await registerHandler(req);
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data).toHaveProperty("user");
      expect(data.user).toHaveProperty("email", "test@example.com");
      expect(data.user).toHaveProperty("name", "Test User");
      expect(data.user).not.toHaveProperty("password");
    });

    it("should reject registration with existing email", async () => {
      // First register a user
      const registerReq = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "existing@example.com",
          password: "password123",
          name: "Existing User"
        }),
      });
      await registerHandler(registerReq);

      // Try to register with same email
      const duplicateReq = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "existing@example.com",
          password: "anotherpassword",
          name: "Duplicate User"
        }),
      });

      const response = await registerHandler(duplicateReq);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("already exists");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      // First register a user
      const registerReq = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "login@example.com",
          password: "login123",
          name: "Login Test User"
        }),
      });
      await registerHandler(registerReq);

      // Now test login
      const loginReq = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "login@example.com",
          password: "login123"
        }),
      });

      const response = await loginHandler(loginReq);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty("token");
      expect(data).toHaveProperty("user");
      expect(data.user).toHaveProperty("email", "login@example.com");
    });

    it("should reject login with invalid credentials", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "nonexistent@example.com",
          password: "wrongpassword",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Invalid credentials");
    });
  });
});
