import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "../auth"

export function withAuth(handler: Function, requiredRoles?: string[]) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      const token =
        request.headers.get("authorization")?.replace("Bearer ", "") || request.cookies.get("auth-token")?.value

      console.log("Auth token being read:", token)

      if (!token) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }

      const user = AuthService.verifyToken(token)
      console.log("Token verification result:", user)

      if (!user) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 })
      }

      // Check role permissions
      if (requiredRoles && !requiredRoles.includes(user.role)) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }
      // Add user to request context
      ;(request as any).user = user

      return handler(request, ...args)
    } catch (error) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }
  }
}
