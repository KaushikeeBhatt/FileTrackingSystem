import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

// Lightweight health check - returns 200 immediately without DB check
// Use /api/health/db for full database health check
export async function GET(request: Request) {
  const url = new URL(request.url)
  const checkDb = url.searchParams.get("db") === "true"

  // Quick health check for deployment readiness
  if (!checkDb) {
    return NextResponse.json(
      {
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      },
      { status: 200 },
    )
  }

  // Full health check with database
  try {
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
