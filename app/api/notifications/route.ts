import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { getUserNotifications } from "@/lib/notification-operations"
import { ObjectId } from "mongodb"
import { rateLimit } from "@/lib/middleware/rate-limit"

async function getNotificationsHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const skip = Number.parseInt(searchParams.get("skip") || "0")

    const notifications = await getUserNotifications(new ObjectId(user.id), limit, skip)

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("Get notifications error:", error)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

export const GET = withAuth(rateLimit("GENERAL")(getNotificationsHandler), ["admin", "manager", "user"])
