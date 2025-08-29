export interface EnvConfig {
  MONGODB_URI: string
  JWT_SECRET: string
  NODE_ENV: "development" | "production" | "test"
  BASE_URL?: string
  MAX_FILE_SIZE?: number
  ALLOWED_FILE_TYPES?: string
}

export function validateEnvironment(): EnvConfig {
  const requiredVars = ["MONGODB_URI", "JWT_SECRET"]
  const missing = requiredVars.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long for security")
  }

  return {
    MONGODB_URI: process.env.MONGODB_URI!,
    JWT_SECRET: process.env.JWT_SECRET!,
    NODE_ENV: (process.env.NODE_ENV as any) || "development",
    BASE_URL: process.env.BASE_URL,
    MAX_FILE_SIZE: Number.parseInt(process.env.MAX_FILE_SIZE || "10485760"),
    ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES || "pdf,doc,docx,txt,jpg,png,gif",
  }
}
