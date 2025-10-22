import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { markNotificationAsRead } from "@/lib/notification-operations"
import { ObjectId } from "mongodb"

async function markAsReadHandler(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = (request as any).user
    const { id } = await params
    const result = await markNotificationAsRead(new ObjectId(id), new ObjectId(user.id))

    return NextResponse.json({ success: result.success })
  } catch (error) {
    console.error("Mark notification as read error:", error)
    return NextResponse.json({ success: false, error: "Failed to mark notification as read" }, { status: 500 })
  }
}

export const PATCH = withAuth(markAsReadHandler)
