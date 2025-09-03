import { hashPassword, verifyPassword, generateToken, verifyToken } from "@/lib/auth-utils";
import { AuthUser } from "@/lib/auth";
import jwt from 'jsonwebtoken';

describe("Authentication Utils", () => {
  // Mock process.env
  const originalEnv = process.env;
  
  const mockUser: AuthUser = {
    id: "test-user-id",
    userId: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    role: "user",
    department: "IT"
  };

  beforeAll(() => {
    // Setup test environment
    process.env.JWT_SECRET = 'test-secret';
    // Make NODE_ENV writable
    Object.defineProperty(process, 'env', {
      value: {
        ...process.env,
        NODE_ENV: 'test'
      },
      writable: true,
      configurable: true
    });
  });

  afterAll(() => {
    // Restore original environment
    Object.defineProperty(process, 'env', {
      value: originalEnv,
      writable: true,
      configurable: true
    });
  });

  describe("Password hashing", () => {
    it("should hash password correctly", async () => {
      const password = "testpassword123";
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
    });

    it("should verify correct password", async () => {
      const password = "testpassword123";
      const hashedPassword = await hashPassword(password);
      const isValid = await verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const hashedPassword = await hashPassword("correctpassword");
      const isValid = await verifyPassword("wrongpassword", hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe("JWT tokens", () => {
    it("should generate valid JWT token with correct payload", () => {
      const token = generateToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      
      // Verify token structure
      const parts = token.split(".");
      expect(parts).toHaveLength(3);
      
      // Verify payload
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        department: mockUser.department
      });
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
    });

    it("should verify valid JWT token", () => {
      const token = generateToken(mockUser);
      const decoded = verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        department: mockUser.department
      });
    });

    it("should return null for invalid token", () => {
      expect(verifyToken("invalid.token.here")).toBeNull();
      expect(verifyToken("")).toBeNull();
      expect(verifyToken(null as any)).toBeNull();
      expect(verifyToken(undefined as any)).toBeNull();
    });

    it("should return null for expired token", () => {
      const expiredToken = jwt.sign(
        { ...mockUser, exp: Math.floor(Date.now() / 1000) - 1 },
        process.env.JWT_SECRET!
      );
      
      expect(verifyToken(expiredToken)).toBeNull();
    });

    it("should handle token signed with wrong secret", () => {
      const wrongSecretToken = jwt.sign(mockUser, 'wrong-secret');
      expect(verifyToken(wrongSecretToken)).toBeNull();
    });
  });
});