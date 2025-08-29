import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { SearchOperations } from "@/lib/search-operations"

async function savedSearchesHandler(request: NextRequest) {
  try {
    const user = (request as any).user

    const searches = await SearchOperations.getSavedSearches(user.id)

    return NextResponse.json({ searches })
  } catch (error) {
    console.error("Saved searches error:", error)
    return NextResponse.json({ error: "Failed to get saved searches" }, { status: 500 })
  }
}

export const GET = withAuth(savedSearchesHandler)
