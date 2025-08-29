import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { SearchOperations } from "@/lib/search-operations"
import { rateLimit } from "@/lib/middleware/rate-limit"

async function saveSearchHandler(request: NextRequest) {
  try {
    const user = (request as any).user
    const { searchQuery, filters } = await request.json()

    await SearchOperations.saveSearch(user.id, searchQuery, filters)

    return NextResponse.json({ message: "Search saved successfully" })
  } catch (error) {
    console.error("Save search error:", error)
    return NextResponse.json({ error: "Failed to save search" }, { status: 500 })
  }
}

export const POST = rateLimit("GENERAL")(withAuth(saveSearchHandler))
