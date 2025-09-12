import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "../auth"

export function withAuth(handler: Function, requiredRoles?: string[]) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      const token =
        request.headers.get("authorization")?.replace("Bearer ", "") || request.cookies.get("auth-token")?.value

      console.log("Auth token being read:", token)

      if (!token) {
        return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
      }

      const user = await AuthService.verifyToken(token)
      console.log("Token verification result:", user)

      if (!user) {
        return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 })
      }

      // Check role permissions
      if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
      }
      
      // Add user to request context
      ;(request as any).user = user

      const response = await handler(request, ...args)
      
      // If the response is a JSON response, ensure it has a success property
      if (response instanceof NextResponse) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.clone().json();
          if (data && typeof data === 'object' && !('success' in data)) {
            data.success = true;
            return NextResponse.json(data, { status: response.status });
          }
        }
      }
      
      return response;
    } catch (error) {
      console.error("Authentication error:", error)
      return NextResponse.json({ success: false, error: "Authentication failed" }, { status: 401 })
    }
  }
}
