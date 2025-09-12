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

    return NextResponse.json(
      {
        database: "connected",
        uptime: process.uptime(),
        version: process.env.npm_package_version || "1.0.0",
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        memory: process.memoryUsage(),
        ...(missingVars.length > 0 && {
          warnings: [`Missing environment variables: ${missingVars.join(", ")}`],
        }),
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        database: "disconnected",
        uptime: process.uptime(),
        version: process.env.npm_package_version || "1.0.0",
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    )
  }
}
