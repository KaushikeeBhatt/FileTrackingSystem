import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { markAllNotificationsAsRead } from "@/lib/notification-operations"
import { ObjectId } from "mongodb"

async function markAllAsReadHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    const result = await markAllNotificationsAsRead(new ObjectId(user.id))

    return NextResponse.json({ success: result.success, updatedCount: result.updatedCount })
  } catch (error) {
    console.error("Mark all notifications as read error:", error)
    return NextResponse.json({ success: false, error: "Failed to mark all notifications as read" }, { status: 500 })
  }
}

export const PATCH = withAuth(markAllAsReadHandler)
