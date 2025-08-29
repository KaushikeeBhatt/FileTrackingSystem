import { type NextRequest, NextResponse } from "next/server"
import { withAuthAndRateLimit } from "@/lib/middleware/rate-limit"
import { SearchOperations } from "@/lib/search-operations"

async function advancedSearchHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    const filters = await request.json()

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const skip = Number.parseInt(searchParams.get("skip") || "0")

    const results = await SearchOperations.advancedSearch(filters, user.id, user.role, limit, skip)

    return NextResponse.json(results)
  } catch (error) {
    console.error("Advanced search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}

export const POST = withAuthAndRateLimit(advancedSearchHandler, undefined, "SEARCH")
