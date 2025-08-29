import { type NextRequest, NextResponse } from "next/server"
import { checkRateLimit, RATE_LIMITS, defaultKeyGenerator, roleBasedKeyGenerator } from "../rate-limiter"

export function withRateLimit(
  handler: Function,
  limitType: keyof typeof RATE_LIMITS = "GENERAL",
  useRoleBasedLimits = false,
) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      // Get the appropriate rate limit config
      let config = RATE_LIMITS[limitType]

      // Adjust limits based on user role if enabled
      if (useRoleBasedLimits && (request as any).user) {
        const user = (request as any).user
        if (user.role === "admin") {
          // Admins get 3x the normal limit
          config = {
            ...config,
            maxRequests: config.maxRequests * 3,
          }
        } else if (user.role === "manager") {
          // Managers get 2x the normal limit
          config = {
            ...config,
            maxRequests: config.maxRequests * 2,
          }
        }
      }

      const keyGenerator = useRoleBasedLimits ? roleBasedKeyGenerator : defaultKeyGenerator
      const { allowed, remaining, resetTime } = await checkRateLimit(request, config, keyGenerator)

      if (!allowed) {
        const response = NextResponse.json(
          {
            error: "Rate limit exceeded",
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
          },
          { status: 429 },
        )

        // Add rate limit headers
        response.headers.set("X-RateLimit-Limit", config.maxRequests.toString())
        response.headers.set("X-RateLimit-Remaining", remaining.toString())
        response.headers.set("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString())
        response.headers.set("Retry-After", Math.ceil((resetTime - Date.now()) / 1000).toString())

        return response
      }

      // Add rate limit headers to successful responses
      const response = await handler(request, ...args)

      if (response instanceof NextResponse) {
        response.headers.set("X-RateLimit-Limit", config.maxRequests.toString())
        response.headers.set("X-RateLimit-Remaining", remaining.toString())
        response.headers.set("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString())
      }

      return response
    } catch (error) {
      console.error("Rate limiting error:", error)
      // If rate limiting fails, allow the request to proceed
      return handler(request, ...args)
    }
  }
}

export function rateLimit(limitType: keyof typeof RATE_LIMITS = "GENERAL") {
  return (handler: Function) => withRateLimit(handler, limitType, true)
}

// Combine auth and rate limiting middleware
export function withAuthAndRateLimit(
  handler: Function,
  requiredRoles?: string[],
  limitType: keyof typeof RATE_LIMITS = "GENERAL",
) {
  return withRateLimit(
    async (request: NextRequest, ...args: any[]) => {
      // Import here to avoid circular dependency
      const { withAuth } = await import("./auth")
      const authHandler = withAuth(handler, requiredRoles)
      return authHandler(request, ...args)
    },
    limitType,
    true, // Use role-based limits since we have auth
  )
}
