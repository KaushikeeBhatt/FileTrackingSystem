import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { getUserNotificationPreferences, updateNotificationPreferences } from "@/lib/notification-operations"
import { ObjectId } from "mongodb"

async function getPreferencesHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    const preferences = await getUserNotificationPreferences(new ObjectId(user.id))

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error("Get notification preferences error:", error)
    return NextResponse.json({ error: "Failed to fetch notification preferences" }, { status: 500 })
  }
}

async function updatePreferencesHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    const preferences = await request.json()

    await updateNotificationPreferences(new ObjectId(user.id), preferences)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update notification preferences error:", error)
    return NextResponse.json({ error: "Failed to update notification preferences" }, { status: 500 })
  }
}

export const GET = withAuth(getPreferencesHandler)
export const PATCH = withAuth(updatePreferencesHandler)