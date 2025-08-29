import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { withRateLimit } from "@/lib/middleware/rate-limit"

async function registerHandler(request: NextRequest) {
  try {
    const userData = await request.json()

    if (!userData.email || !userData.password || !userData.name) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 })
    }

    const result = await AuthService.register(userData)

    if (!result) {
      return NextResponse.json({ error: "Registration failed. Email may already be in use." }, { status: 400 })
    }

    const response = NextResponse.json({
      user: result.user,
      token: result.token,
    })

    // Set HTTP-only cookie for additional security
    response.cookies.set("auth-token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export const POST = withRateLimit(registerHandler, "AUTH")
