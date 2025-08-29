import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { AuditOperations } from "@/lib/audit-operations"

async function auditStatsHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    const { searchParams } = new URL(request.url)

    const filters = {
      dateFrom: searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : undefined,
      dateTo: searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : undefined,
    }

    const stats = await AuditOperations.getAuditStats(filters, user.role, user.id)

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Audit stats error:", error)
    return NextResponse.json({ error: "Failed to fetch audit stats" }, { status: 500 })
  }
}

export const GET = withAuth(auditStatsHandler, ["admin", "manager", "user"])
