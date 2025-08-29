import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { AdminOperations } from "@/lib/admin-operations"
import { rateLimit } from "@/lib/middleware/rate-limit"

async function bulkApproveHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    const { fileIds } = await request.json()

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: "File IDs are required" }, { status: 400 })
    }

    const count = await AdminOperations.bulkApproveFiles(fileIds, user.id)

    return NextResponse.json({ count, message: `Approved ${count} files successfully` })
  } catch (error) {
    console.error("Bulk approve error:", error)
    return NextResponse.json({ error: "Failed to approve files" }, { status: 500 })
  }
}

export const POST = rateLimit("ADMIN")(withAuth(bulkApproveHandler, ["admin", "manager"]))
