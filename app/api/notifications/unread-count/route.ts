import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { getUnreadNotificationCount } from "@/lib/notification-operations"
import { ObjectId } from "mongodb"

async function getUnreadCountHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    const count = await getUnreadNotificationCount(new ObjectId(user.id))

    return NextResponse.json({ count })
  } catch (error) {
    console.error("Get unread count error:", error)
    return NextResponse.json({ error: "Failed to fetch unread count" }, { status: 500 })
  }
}

export const GET = withAuth(getUnreadCountHandler)
