import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { FileSharingOperations } from "@/lib/file-sharing-operations"
import { rateLimit } from "@/lib/middleware/rate-limit"

async function shareFileHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = (request as any).user
    const fileId = params.id
    const { sharedWith, permissions, expiresAt } = await request.json()

    const result = await FileSharingOperations.shareFile(
      fileId,
      user.id,
      sharedWith,
      permissions,
      expiresAt ? new Date(expiresAt) : undefined,
    )

    return NextResponse.json({ success: true, shareId: result.insertedId })
  } catch (error) {
    console.error("Share file error:", error)
    return NextResponse.json({ error: "Failed to share file" }, { status: 500 })
  }
}

async function getFileSharesHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = (request as any).user
    const fileId = params.id

    const permissions = await FileSharingOperations.getFilePermissions(fileId, user.id)

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error("Get file shares error:", error)
    return NextResponse.json({ error: "Failed to get file shares" }, { status: 500 })
  }
}

export const POST = rateLimit("GENERAL")(withAuth(shareFileHandler))
export const GET = rateLimit("GENERAL")(withAuth(getFileSharesHandler))
