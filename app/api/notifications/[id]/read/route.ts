import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { markNotificationAsRead } from "@/lib/notification-operations"
import { ObjectId } from "mongodb"

async function markAsReadHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = (request as any).user
    await markNotificationAsRead(new ObjectId(params.id), new ObjectId(user.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Mark notification as read error:", error)
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 })
  }
}

export const PATCH = withAuth(markAsReadHandler)
