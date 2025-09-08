import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { AdminOperations } from "@/lib/admin-operations"
import { rateLimit } from "@/lib/middleware/rate-limit"

async function bulkApproveHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    const { fileIds } = await request.json()

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ success: false, error: "File IDs are required" }, { status: 400 })
    }

    const result = await AdminOperations.bulkApproveFiles(fileIds, user.id)

    // Handle both object and number return types
    const approved = typeof result === 'object' ? (result as any).approved : result
    const failed = typeof result === 'object' ? (result as any).failed : 0

    return NextResponse.json({ 
      success: true, 
      approved,
      failed,
      message: `Approved ${approved} files successfully` 
    })
  } catch (error) {
    console.error("Bulk approve error:", error)
    return NextResponse.json({ success: false, error: "Failed to approve files" }, { status: 500 })
  }
}

export const POST = rateLimit("ADMIN")(withAuth(bulkApproveHandler, ["admin", "manager"]))
