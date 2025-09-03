import type { NextRequest } from "next/server"

interface RateLimitConfig {
  windowMs: RateLimitWindow
  maxRequests: MaxRequests
  keyGenerator?: (request: NextRequest) => string
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

type RateLimitWindow = 60000 | 300000 | 600000 | 1800000 | 3600000 // 1 min | 5 min | 10 min | 30 min | 1 hour
type MaxRequests = 5 | 10 | 20 | 30 | 60 | 100 | 200 | 500 | 1000

class RateLimiter {
  private store: RateLimitStore = {}
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup()
      },
      5 * 60 * 1000,
    )
  }

  private cleanup() {
    const now = Date.now()
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now) {
        delete this.store[key]
      }
    })
  }

  async isAllowed(
    key: string,
    config: RateLimitConfig,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now()
    const windowStart = now
    const windowEnd = now + config.windowMs

    if (!this.store[key] || this.store[key].resetTime < now) {
      // Initialize or reset the counter
      this.store[key] = {
        count: 1,
        resetTime: windowEnd,
      }
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: windowEnd,
      }
    }

    // Increment the counter
    this.store[key].count++

    const allowed = this.store[key].count <= config.maxRequests
    const remaining = Math.max(0, config.maxRequests - this.store[key].count)

    return {
      allowed,
      remaining,
      resetTime: this.store[key].resetTime,
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter()

// Rate limit configurations for different endpoint types
export const RATE_LIMITS = {
  // General API endpoints (default)
  GENERAL: {
    windowMs: 60000 as RateLimitWindow, // 1 minute
    maxRequests: 100 as MaxRequests,    // 100 requests per minute
  },
  
  // Authentication endpoints (login, register, etc.)
  AUTH: {
    windowMs: 300000 as RateLimitWindow, // 5 minutes
    maxRequests: 10 as MaxRequests,     // 10 requests per 5 minutes
  },
  
  // File upload endpoints
  UPLOAD: {
    windowMs: 3600000 as RateLimitWindow, // 1 hour
    maxRequests: 20 as MaxRequests,      // 20 uploads per hour
  },
  
  // File download endpoints
  DOWNLOAD: {
    windowMs: 600000 as RateLimitWindow, // 10 minutes
    maxRequests: 30 as MaxRequests,      // 30 downloads per 10 minutes
  },
  
  // API key endpoints
  API_KEY: {
    windowMs: 3600000 as RateLimitWindow, // 1 hour
    maxRequests: 5 as MaxRequests,        // 5 key generations per hour
  },
  
  // Search endpoints - moderate limits
  SEARCH: {
    windowMs: 60000 as RateLimitWindow, // 1 minute
    maxRequests: 30 as MaxRequests,     // 30 searches per minute
  },
  
  // Admin endpoints - higher limits for admin users
  ADMIN: {
    windowMs: 60000 as RateLimitWindow, // 1 minute
    maxRequests: 100 as MaxRequests,    // 100 requests per minute
  },
  
  // Public endpoints (no auth required)
  PUBLIC: {
    windowMs: 60000 as RateLimitWindow, // 1 minute
    maxRequests: 20 as MaxRequests,     // 20 requests per minute
  },
} as const satisfies Record<string, RateLimitConfig>

// Default key generator - uses IP for unauthenticated, user ID for authenticated
export function defaultKeyGenerator(request: NextRequest): string {
  const user = (request as any).user
  if (user) {
    return `user:${user.id}`
  }

  // Fallback to IP address for unauthenticated requests
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown"
  return `ip:${ip}`
}

// Role-based key generator for different limits based on user role
export function roleBasedKeyGenerator(request: NextRequest): string {
  const user = (request as any).user
  if (user) {
    return `${user.role}:${user.id}`
  }
  return defaultKeyGenerator(request)
}

export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  keyGenerator: (req: NextRequest) => string = defaultKeyGenerator,
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const key = keyGenerator(request)
  return rateLimiter.isAllowed(key, config)
}

export type { RateLimitWindow }

export { 
  rateLimiter, 
  type MaxRequests,
  type RateLimitConfig
}
