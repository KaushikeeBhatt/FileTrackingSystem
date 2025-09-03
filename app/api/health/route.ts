import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    // Check database connection
    const db = await getDatabase()
    await db.admin().ping()

    // Check environment variables
    const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET"]
    const missingVars = requiredEnvVars.filter((key) => !process.env[key])

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      database: "connected",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      ...(missingVars.length > 0 && {
        warnings: [`Missing environment variables: ${missingVars.join(", ")}`],
      }),
    }

    return NextResponse.json(health, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        database: "disconnected",
      },
      { status: 503 },
    )
  }
}
