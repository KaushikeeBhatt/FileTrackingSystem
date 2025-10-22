import { type NextRequest, NextResponse } from "next/server"
import { withAuthAndRateLimit } from "@/lib/middleware/rate-limit"
import { AdminOperations } from "@/lib/admin-operations"
import { getDatabase } from "@/lib/mongodb"

async function adminStatsHandler(request: NextRequest) {
  try {
    // Test database connection first
    try {
      const db = await getDatabase()
      await db.command({ ping: 1 })
    } catch (dbError) {
      console.error("Database connection error:", dbError)
      return NextResponse.json(
        { success: false, error: "Database connection error" }, 
        { status: 503 }
      )
    }

    const stats = await AdminOperations.getSystemStats()
    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch system stats" 
      }, 
      { status: 500 }
    )
  }
}

export const GET = withAuthAndRateLimit(adminStatsHandler, ["admin"], "ADMIN")