import { NextRequest } from "next/server"
import { POST as loginHandler } from "@/app/api/auth/login/route"
import { POST as registerHandler } from "@/app/api/auth/register/route"
import { createTestUser, setupTestDatabase, cleanupTestDatabase } from "../utils/test-helpers"

describe("/api/auth", () => {
  let client, db

  beforeAll(async () => {
    const setup = await setupTestDatabase()
    client = setup.client
    db = setup.db
  })

  afterAll(async () => {
    await cleanupTestDatabase(client)
  })

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "newuser@example.com",
        password: "password123",
        name: "New User",
      }

      const request = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
        headers: { "Content-Type": "application/json" },
      })

      const response = await registerHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.user.email).toBe(userData.email)
      expect(data.user.name).toBe(userData.name)
      expect(data.token).toBeDefined()
    })

    it("should reject registration with existing email", async () => {
      const existingUser = await createTestUser()
      await db.collection("users").insertOne(existingUser)

      const request = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: existingUser.email,
          password: "password123",
          name: "Another User",
        }),
        headers: { "Content-Type": "application/json" },
      })

      const response = await registerHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain("already exists")
    })
  })

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const testUser = await createTestUser()
      await db.collection("users").insertOne(testUser)

      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: testUser.email,
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user.email).toBe(testUser.email)
      expect(data.token).toBeDefined()
    })

    it("should reject login with invalid credentials", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "nonexistent@example.com",
          password: "wrongpassword",
        }),
        headers: { "Content-Type": "application/json" },
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain("Invalid credentials")
    })
  })
})
