import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { AdminOperations } from "@/lib/admin-operations"
import { rateLimit } from "@/lib/middleware/rate-limit"

async function adminUsersHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const skip = Number.parseInt(searchParams.get("skip") || "0")

    const result = await AdminOperations.getAllUsers(limit, skip)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Admin users error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

async function createUserHandler(request: NextRequest) {
  try {
    const userData = await request.json()

    if (!userData.name || !userData.email || !userData.password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }

    const userId = await AdminOperations.createUser(userData)
    return NextResponse.json({ userId: userId.toString(), message: "User created successfully" })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 500 },
    )
  }
}

export const GET = rateLimit("ADMIN")(withAuth(adminUsersHandler, ["admin"]))
export const POST = rateLimit("ADMIN")(withAuth(createUserHandler, ["admin"]))
