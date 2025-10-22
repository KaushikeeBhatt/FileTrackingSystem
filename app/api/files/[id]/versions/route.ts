import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { rateLimit } from "@/lib/middleware/rate-limit"
import { FileOperations } from "@/lib/file-operations"

async function listVersionsHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: fileId } = await params
    const versions = await FileOperations.listFileVersions(fileId)
    return NextResponse.json({ success: true, versions })
  } catch (error) {
    console.error("List versions error:", error)
    return NextResponse.json({ success: false, error: "Failed to list versions" }, { status: 500 })
  }
}

export const GET = rateLimit("GENERAL")(withAuth(listVersionsHandler))
