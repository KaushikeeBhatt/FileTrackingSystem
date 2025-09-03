import { hashPassword, verifyPassword, generateToken, verifyToken } from "@/lib/auth-utils"
import { AuthUser } from "@/lib/auth"

describe("Authentication Utils", () => {
  const mockUser: AuthUser = {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    role: "user",
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
      if (!decoded) return
      
      expect(decoded.id).toBe(mockUser.id)
      expect(decoded.role).toBe(mockUser.role)
      expect(decoded.email).toBe(mockUser.email)
      expect(decoded.name).toBe(mockUser.name)
    })

    it("should return null for invalid token", () => {
      const result = verifyToken("invalid.token.here")
      expect(result).toBeNull()
    })
  })
})
