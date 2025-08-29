import { type NextRequest, NextResponse } from "next/server"
import { withAuthAndRateLimit } from "@/lib/middleware/rate-limit"
import { AdminOperations } from "@/lib/admin-operations"

async function adminStatsHandler(request: NextRequest) {
  try {
    const stats = await AdminOperations.getSystemStats()
    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json({ error: "Failed to fetch system stats" }, { status: 500 })
  }
}

export const GET = withAuthAndRateLimit(adminStatsHandler, ["admin"], "ADMIN")
