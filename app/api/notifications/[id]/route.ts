import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { deleteNotification } from "@/lib/notification-operations"
import { ObjectId } from "mongodb"

async function deleteNotificationHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = (request as any).user
    const { id } = await params
    const result = await deleteNotification(new ObjectId(id), new ObjectId(user.id))

    return NextResponse.json({ success: result.success })
  } catch (error) {
    console.error("Delete notification error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete notification" }, { status: 500 })
  }
}

export const DELETE = withAuth(deleteNotificationHandler)
