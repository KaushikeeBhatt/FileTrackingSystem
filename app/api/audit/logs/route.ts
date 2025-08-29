import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { AuditOperations } from "@/lib/audit-operations"

async function auditLogsHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    const { searchParams } = new URL(request.url)

    const filters = {
      userId: searchParams.get("userId") || undefined,
      action: searchParams.get("action") || undefined,
      resourceType: searchParams.get("resourceType") || undefined,
      resourceId: searchParams.get("resourceId") || undefined,
      dateFrom: searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : undefined,
      dateTo: searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : undefined,
      success: searchParams.get("success") ? searchParams.get("success") === "true" : undefined,
    }

    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const skip = Number.parseInt(searchParams.get("skip") || "0")

    const result = await AuditOperations.getAuditTrail(filters, user, limit, skip)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Audit logs error:", error)
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
  }
}

export const GET = withAuth(auditLogsHandler, ["admin", "manager", "user"])
