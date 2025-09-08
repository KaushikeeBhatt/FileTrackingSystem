import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { SearchOperations } from "@/lib/search-operations"
import { rateLimit } from "@/lib/middleware/rate-limit"

async function saveSearchHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    const { searchQuery, filters } = await request.json()

    // Validate required fields
    if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Search query is required" }, { status: 400 })
    }

    if (!filters || typeof filters !== 'object') {
      return NextResponse.json({ success: false, error: "Search filters are required" }, { status: 400 })
    }

    await SearchOperations.saveSearch(user.id, searchQuery, filters)

    return NextResponse.json({ success: true, message: "Search saved successfully" }, { status: 201 })
  } catch (error) {
    console.error("Save search error:", error)
    return NextResponse.json({ success: false, error: "Failed to save search" }, { status: 500 })
  }
}

export const POST = rateLimit("GENERAL")(withAuth(saveSearchHandler))
