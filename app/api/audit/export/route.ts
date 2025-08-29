import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { AuditOperations } from "@/lib/audit-operations"
import { rateLimit } from "@/lib/middleware/rate-limit"

async function auditExportHandler(request: NextRequest) {
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

    const format = (searchParams.get("format") as "csv" | "json") || "csv"

    const report = await AuditOperations.exportAuditReport(filters, user, format)

    const contentType = format === "csv" ? "text/csv" : "application/json"
    const filename = `audit-report-${new Date().toISOString().split("T")[0]}.${format}`

    return new NextResponse(report, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Audit export error:", error)
    return NextResponse.json({ error: "Failed to export audit report" }, { status: 500 })
  }
}

export const GET = rateLimit("ADMIN")(withAuth(auditExportHandler, ["admin", "manager"]))
