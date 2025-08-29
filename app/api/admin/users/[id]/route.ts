import { type NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/middleware/auth"
import { AdminOperations } from "@/lib/admin-operations"

async function updateUserHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id
    const updates = await request.json()

    const success = await AdminOperations.updateUser(userId, updates)

    if (!success) {
      return NextResponse.json({ error: "User not found or update failed" }, { status: 404 })
    }

    return NextResponse.json({ message: "User updated successfully" })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

async function deleteUserHandler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id

    const success = await AdminOperations.deleteUser(userId)

    if (!success) {
      return NextResponse.json({ error: "User not found or deletion failed" }, { status: 404 })
    }

    return NextResponse.json({ message: "User deactivated successfully" })
  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json({ error: "Failed to deactivate user" }, { status: 500 })
  }
}

export const PUT = withAuth(updateUserHandler, ["admin"])
export const DELETE = withAuth(deleteUserHandler, ["admin"])
