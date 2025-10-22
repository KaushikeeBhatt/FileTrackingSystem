import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { rateLimit } from "@/lib/middleware/rate-limit"
import { FileOperations } from "@/lib/file-operations"

async function rollbackHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = (request as any).user
    const { id: fileId } = await params

    const body = await request.json().catch(() => null)
    if (!body || typeof body.version !== "number") {
      return NextResponse.json({ success: false, error: "'version' (number) is required" }, { status: 400 })
    }

    const result = await FileOperations.rollbackToVersion(fileId, body.version, user)
    return NextResponse.json({ success: true, version: result.version, message: "Rollback completed" })
  } catch (error) {
    console.error("Rollback error:", error)
    return NextResponse.json({ success: false, error: "Failed to rollback" }, { status: 500 })
  }
}

export const POST = rateLimit("GENERAL")(withAuth(rollbackHandler, ["admin", "manager"]))
