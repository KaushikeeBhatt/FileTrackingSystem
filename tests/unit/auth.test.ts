import { hashPassword, verifyPassword, generateToken, verifyToken } from "@/lib/auth"

describe("Authentication Utils", () => {
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
      const payload = { userId: "test-user-id", role: "user" }
      const token = generateToken(payload)

      expect(token).toBeDefined()
      expect(typeof token).toBe("string")
      expect(token.split(".")).toHaveLength(3)
    })

    it("should verify JWT token correctly", () => {
      const payload = { userId: "test-user-id", role: "user" }
      const token = generateToken(payload)

      const decoded = verifyToken(token)
      expect(decoded).toBeDefined()
      expect(decoded.userId).toBe(payload.userId)
      expect(decoded.role).toBe(payload.role)
    })

    it("should reject invalid JWT token", () => {
      const invalidToken = "invalid.jwt.token"

      expect(() => verifyToken(invalidToken)).toThrow()
    })
  })
})
