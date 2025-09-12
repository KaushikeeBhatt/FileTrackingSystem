import { type NextRequest, NextResponse } from "next/server"
import { 
  checkRateLimit, 
  defaultKeyGenerator, 
  roleBasedKeyGenerator, 
  getRateLimitConfig,
  type RateLimitType 
} from "../rate-limiter"

export function withRateLimit(
  handler: Function,
  limitType: RateLimitType = "GENERAL",
  useRoleBasedLimits = false,
) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      // Get the appropriate rate limit config based on user role
      const user = (request as any).user;
      const role = useRoleBasedLimits && user?.role;
      const config = getRateLimitConfig(limitType, role);

      const keyGenerator = useRoleBasedLimits ? roleBasedKeyGenerator : defaultKeyGenerator
      const { allowed, remaining, resetTime } = await checkRateLimit(request, config, keyGenerator)

      if (!allowed) {
        const response = NextResponse.json(
          {
            success: false,
            error: "Rate limit exceeded",
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
          },
          { status: 429 },
        )

        response.headers.set("Retry-After", Math.ceil((resetTime - Date.now()) / 1000).toString())
        response.headers.set("X-RateLimit-Limit", config.maxRequests.toString())
        response.headers.set("X-RateLimit-Remaining", remaining.toString())
        response.headers.set("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString())

        return response
      }

      const response = await handler(request, ...args)

      if (response instanceof NextResponse) {
        // Ensure success property is set for successful responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.clone().json();
          if (data && typeof data === 'object' && !('success' in data)) {
            data.success = true;
            const newResponse = NextResponse.json(data, { status: response.status });
            
            // Copy all headers from original response
            response.headers.forEach((value, key) => {
              newResponse.headers.set(key, value);
            });
            
            // Set rate limit headers
            newResponse.headers.set("X-RateLimit-Limit", config.maxRequests.toString())
            newResponse.headers.set("X-RateLimit-Remaining", remaining.toString())
            newResponse.headers.set("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString())
            
            return newResponse;
          }
        }
        
        // If we didn't modify the response, just add the rate limit headers
        response.headers.set("X-RateLimit-Limit", config.maxRequests.toString())
        response.headers.set("X-RateLimit-Remaining", remaining.toString())
        response.headers.set("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString())
      }

      return response
    } catch (error) {
      console.error("Error in rate limit middleware:", error)
      return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
    }
  }
}

export function rateLimit(limitType: RateLimitType = "GENERAL") {
  return (handler: Function) => withRateLimit(handler, limitType, true)
}

// Combine auth and rate limiting middleware
export function withAuthAndRateLimit(
  handler: Function,
  requiredRoles?: string[],
  limitType: RateLimitType = "GENERAL",
) {
  return withRateLimit(
    async (request: NextRequest, ...args: any[]) => {
      // Import auth middleware here to avoid circular dependencies
      const { withAuth } = await import('./auth');
      const authHandler = withAuth(handler, requiredRoles);
      return authHandler(request, ...args);
    },
    limitType,
    true,
  )
}
