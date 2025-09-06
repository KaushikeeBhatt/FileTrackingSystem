import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { UserOperations } from "./user-operations"
import { validateEnvironment } from "./env-validation"
import { AuditOperations } from "./audit-operations"
import type { User } from "./models/user"

import type { EnvConfig } from "./env-validation";

let env: { isValid: boolean; config: EnvConfig | null; errors: string[] };
let JWT_SECRET: string;
const JWT_EXPIRES_IN = "7d";

// Initialize the environment variables
async function initializeAuth() {
  if (!env) {
    env = validateEnvironment();
    if (!env.isValid || !env.config) {
      throw new Error(`Environment validation failed: ${env.errors.join(', ')}`);
    }
    JWT_SECRET = env.config.JWT_SECRET;
  }
}

export interface AuthUser {
  id: string
  userId: string
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

  static async generateToken(user: AuthUser): Promise<string> {
    await initializeAuth();
    return jwt.sign(
      {
        id: user.id,
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )
  }

  static async verifyToken(token: string): Promise<AuthUser | null> {
    await initializeAuth();
    if (!token || token === "null") {
      return null
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser & { iat: number; exp: number }
      return {
        id: decoded.id,
        userId: decoded.userId,
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
    await initializeAuth();
    const user = await UserOperations.getUserByEmail(email)
    if (!user) {
      return null
    }

    const isValid = await this.verifyPassword(password, user.password)
    if (!isValid) {
      return null
    }

    const authUser: AuthUser = {
      id: user._id!.toString(),
      userId: user._id!.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    }

    const token = await this.generateToken(authUser)

    // Log successful login
    await AuditOperations.createLog({
      userId: user._id!,
      action: "login",
      resourceType: "user",
      resourceId: user._id!,
      details: { ipAddress: "unknown" },
      status: "success"
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
    await initializeAuth();
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
      status: 'active',
    })

    const authUser: AuthUser = {
      id: userId.toString(),
      userId: userId.toString(),
      email: userData.email,
      name: userData.name,
      role: userData.role || "user",
      department: userData.department,
    }

    const token = await this.generateToken(authUser)

    // Log successful registration
    await AuditOperations.createLog({
      userId: userId,
      action: "create",
      resourceType: "user",
      resourceId: userId,
      details: { action: "user_registered" },
      status: "success"
    })

    return { user: authUser, token }
  }
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  await initializeAuth();
  return AuthService.verifyToken(token);
}
