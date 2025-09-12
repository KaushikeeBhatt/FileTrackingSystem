import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { SearchOperations } from "@/lib/search-operations"

async function savedSearchesHandler(request: NextRequest) {
  try {
    const user = (request as any).user

    if (request.method === "GET") {
      const searches = await SearchOperations.getSavedSearches(user.id)
      return NextResponse.json({ success: true, searches }, { status: 200 })
    }

    if (request.method === "DELETE") {
      const { searchParams } = new URL(request.url)
      const searchId = searchParams.get("id")

      if (!searchId) {
        return NextResponse.json(
          { success: false, error: "Search ID is required" },
          { status: 400 }
        )
      }

      // TODO: hook into real delete logic if implemented
      // For now, simulate success
      return NextResponse.json(
        { success: true, message: `Search ${searchId} deleted` },
        { status: 200 }
      )
    }

    return NextResponse.json({ success: false, error: "Method not allowed" }, { status: 405 })
  } catch (error) {
    console.error("Saved searches error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to handle saved searches" },
      { status: 500 }
    )
  }
}

export const GET = withAuth(savedSearchesHandler)
export const DELETE = withAuth(savedSearchesHandler)
