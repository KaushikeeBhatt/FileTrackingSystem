import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { deleteNotification } from "@/lib/notification-operations"
import { ObjectId } from "mongodb"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    await deleteNotification(new ObjectId(params.id), new ObjectId(payload.userId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete notification error:", error)
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 })
  }
}
