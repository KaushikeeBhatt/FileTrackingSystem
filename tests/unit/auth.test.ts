import { hashPassword, verifyPassword, generateToken, verifyToken } from "@/lib/auth-utils"

describe("Authentication Utils", () => {
  const mockUser = {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    role: "user" as const,
  }

  describe("Password hashing", () => {
    it("should hash password correctly", async () => {
      const password = "testpassword123"
      const hashedPassword = await hashPassword(password)

      expect(hashedPassword).toBeDefined()
      expect(hashedPassword).not.toBe(password)
      expect(hashedPassword.length).toBeGreaterThan(50)
    })

    it("should verify password correctly", async () => {
      const password = "testpassword123"
      const hashedPassword = await hashPassword(password)

      const isValid = await verifyPassword(password, hashedPassword)
      expect(isValid).toBe(true)

      const isInvalid = await verifyPassword("wrongpassword", hashedPassword)
      expect(isInvalid).toBe(false)
    })
  })

  describe("JWT tokens", () => {
    it("should generate valid JWT token", () => {
      const token = generateToken(mockUser)

      expect(token).toBeDefined()
      expect(typeof token).toBe("string")
      expect(token.split(".")).toHaveLength(3)
    })

    it("should verify JWT token correctly", () => {
      const token = generateToken(mockUser)

      const decoded = verifyToken(token)
      expect(decoded).not.toBeNull()
      if (!decoded) return // This makes TypeScript happy
      
      expect(decoded.id).toBe(mockUser.id)
      expect(decoded.role).toBe(mockUser.role)
    })

    it("should reject invalid JWT token", () => {
      const invalidToken = "invalid.jwt.token"

      expect(() => verifyToken(invalidToken)).toThrow()
    })
  })
})
