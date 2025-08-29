import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { FileOperations } from "@/lib/file-operations"

async function approveHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = (request as any).user
    const fileId = params.id

    const success = await FileOperations.approveFile(fileId, user.id)

    if (!success) {
      return NextResponse.json({ error: "Failed to approve file" }, { status: 400 })
    }

    return NextResponse.json({ message: "File approved successfully" })
  } catch (error) {
    console.error("Approve error:", error)
    return NextResponse.json({ error: "Approve failed" }, { status: 500 })
  }
}

export const POST = withAuth(approveHandler, ["admin", "manager"])
