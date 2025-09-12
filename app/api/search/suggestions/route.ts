import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { SearchOperations } from "@/lib/search-operations"
import { rateLimit } from "@/lib/middleware/rate-limit"

async function suggestionsHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const limit = Number.parseInt(searchParams.get("limit") || "5")

    // Handle empty query explicitly
    if (!query) {
      return NextResponse.json({ success: true, suggestions: [] }, { status: 200 })
    }

    let suggestions = await SearchOperations.getSearchSuggestions(query, user.id, user.role)

    // Enforce limit (default 5)
    if (Array.isArray(suggestions)) {
      suggestions = suggestions.slice(0, limit)
    }

    return NextResponse.json({ success: true, suggestions }, { status: 200 })
  } catch (error) {
    console.error("Suggestions error:", error)
    return NextResponse.json({ success: false, error: "Failed to get suggestions" }, { status: 500 })
  }
}

export const GET = rateLimit("SEARCH")(withAuth(suggestionsHandler))
