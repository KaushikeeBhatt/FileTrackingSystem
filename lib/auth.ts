import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { UserOperations } from "./user-operations"
import { validateEnvironment } from "./env-validation"
import { AuditOperations } from "./audit-operations"

const env = validateEnvironment()
const JWT_SECRET = env.JWT_SECRET
const JWT_EXPIRES_IN = "7d"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: "admin" | "manager" | "user"
  department?: string
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12)
  }

  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword)
  }

  static generateToken(user: AuthUser): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    )
  }

  static verifyToken(token: string): AuthUser | null {
    if (!token || token === "null") {
      return null
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      return {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        department: decoded.department,
      }
    } catch (error) {
      return null
    }
  }

  static async login(email: string, password: string): Promise<{ user: AuthUser; token: string } | null> {
    const user = await UserOperations.getUserByEmail(email)
    if (!user || !user.isActive) {
      return null
    }

    const isValidPassword = await this.verifyPassword(password, user.password)
    if (!isValidPassword) {
      return null
    }

    const authUser: AuthUser = {
      id: user._id!.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    }

    const token = this.generateToken(authUser)

    // Log successful login
    await AuditOperations.createLog({
      userId: user._id!,
      action: "login",
      resourceType: "user",
      resourceId: user._id!,
      details: { ipAddress: "unknown" }, // Placeholder for IP address
      success: true,
    })

    return { user: authUser, token }
  }

  static async register(userData: {
    email: string
    password: string
    name: string
    role?: "admin" | "manager" | "user"
    department?: string
  }): Promise<{ user: AuthUser; token: string } | null> {
    // Check if user already exists
    const existingUser = await UserOperations.getUserByEmail(userData.email)
    if (existingUser) {
      return null
    }

    // Hash password
    const hashedPassword = await this.hashPassword(userData.password)

    // Create user
    const userId = await UserOperations.createUser({
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      role: userData.role || "user",
      department: userData.department,
      isActive: true,
    })

    const authUser: AuthUser = {
      id: userId.toString(),
      email: userData.email,
      name: userData.name,
      role: userData.role || "user",
      department: userData.department,
    }

    const token = this.generateToken(authUser)

    // Log successful registration
    await AuditOperations.createLog({
      userId: userId,
      action: "register",
      resourceType: "user",
      resourceId: userId,
      details: {},
      success: true,
    })

    return { user: authUser, token }
  }
}

export function verifyToken(token: string): any | null {
  return AuthService.verifyToken(token)
}
