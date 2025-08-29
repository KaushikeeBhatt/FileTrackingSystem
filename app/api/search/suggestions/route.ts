import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { SearchOperations } from "@/lib/search-operations"
import { rateLimit } from "@/lib/middleware/rate-limit"

async function suggestionsHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""

    const suggestions = await SearchOperations.getSearchSuggestions(query, user.id, user.role)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Suggestions error:", error)
    return NextResponse.json({ error: "Failed to get suggestions" }, { status: 500 })
  }
}

export const GET = rateLimit("SEARCH")(withAuth(suggestionsHandler))
