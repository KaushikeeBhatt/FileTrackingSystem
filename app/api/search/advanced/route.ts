import { type NextRequest, NextResponse } from "next/server"
import { withAuthAndRateLimit } from "@/lib/middleware/rate-limit"
import { SearchOperations } from "@/lib/search-operations"

async function advancedSearchHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    const filters = await request.json()

    // Validate required fields
    if (!filters || typeof filters !== 'object') {
      return NextResponse.json({ success: false, error: "Invalid search filters" }, { status: 400 })
    }

    // Validate date range
    if (filters.dateFrom && filters.dateTo) {
      const fromDate = new Date(filters.dateFrom)
      const toDate = new Date(filters.dateTo)
      if (fromDate > toDate) {
        return NextResponse.json({ success: false, error: "Invalid date range: from date must be before to date" }, { status: 400 })
      }
    }

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const skip = Number.parseInt(searchParams.get("skip") || "0")

    const searchResults = await SearchOperations.advancedSearch(filters, user.id, user.role, limit, skip)

    // Format response to match test expectations
    const response = {
      success: true,
      results: searchResults.results,
      pagination: {
        page: Math.floor(skip / limit) + 1,
        limit,
        total: searchResults.total,
        totalPages: Math.ceil(searchResults.total / limit)
      },
      facets: {
        categories: [],
        departments: [],
        fileTypes: [],
        tags: []
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Advanced search error:", error)
    return NextResponse.json({ success: false, error: "Search failed" }, { status: 500 })
  }
}

export const POST = withAuthAndRateLimit(advancedSearchHandler, undefined, "SEARCH")
