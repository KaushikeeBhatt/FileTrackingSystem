import { type NextRequest, NextResponse } from "next/server"
import { withAuthAndRateLimit } from "@/lib/middleware/rate-limit"
import { AdminOperations } from "@/lib/admin-operations"

async function adminAnalyticsHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "30")
    
    const analytics = await AdminOperations.getSystemAnalytics(days)
    return NextResponse.json({ success: true, analytics })
  } catch (error) {
    console.error("Admin analytics error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch analytics" 
      }, 
      { status: 500 }
    )
  }
}

export const GET = withAuthAndRateLimit(adminAnalyticsHandler, ["admin"], "ADMIN")
