import type { NextRequest } from "next/server";

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: NextRequest) => string;
}

// Rate limit configurations for different endpoint types
export const RATE_LIMITS = {
  // General API endpoints (default)
  GENERAL: {
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
  
  // Authentication endpoints (login, register, etc.)
  AUTH: {
    windowMs: 300000, // 5 minutes
    maxRequests: 10, // 10 requests per 5 minutes
  },
  
  // File upload endpoints
  UPLOAD: {
    windowMs: 3600000, // 1 hour
    maxRequests: 20, // 20 requests per hour
  },
  
  // Search endpoints
  SEARCH: {
    windowMs: 60000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
  
  // Admin endpoints
  ADMIN: {
    windowMs: 60000, // 1 minute
    maxRequests: 200, // 200 requests per minute
  },
  
  // Public endpoints
  PUBLIC: {
    windowMs: 60000, // 1 minute
    maxRequests: 20, // 20 requests per minute
  },
} as const;

// Default key generator - uses IP for unauthenticated, user ID for authenticated
export function defaultKeyGenerator(request: NextRequest): string {
  const user = (request as any).user;
  if (user) {
    return `user:${user.id}`;
  }

  // Fallback to IP address for unauthenticated requests
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}

// Role-based key generator for different limits based on user role
export function roleBasedKeyGenerator(request: NextRequest): string {
  const user = (request as any).user;
  
  // Get IP address directly
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown";
  
  if (user) {
    return `${user.role || 'user'}:${user.id}:ip:${ip}`;
  }
  
  return `ip:${ip}`;
}

// In-memory rate limit store
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetTime <= now) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}, 60000); // Clean up every minute

export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  keyGenerator: (req: NextRequest) => string = defaultKeyGenerator,
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const key = keyGenerator(request);
  const now = Date.now();
  const windowMs = config.windowMs;
  const resetTime = now + windowMs;
  
  try {
    // Get or create rate limit entry
    const rateLimitKey = `rate_limit:${key}`;
    let entry = rateLimitStore.get(rateLimitKey);
    
    // If entry doesn't exist or has expired, create a new one
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 1,
        resetTime: resetTime,
      };
      rateLimitStore.set(rateLimitKey, entry);
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime,
      };
    }
    
    // Increment the counter
    entry.count++;
    rateLimitStore.set(rateLimitKey, entry);
    
    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);
    
    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
    };
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Fail open - allow the request if there's an error
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime,
    };
  }
}

// RateLimitConfig is already exported at the interface declaration

export type RateLimitType = keyof typeof RATE_LIMITS;

export function getRateLimitConfig(type: RateLimitType, role?: 'admin' | 'manager'): RateLimitConfig {
  const config = { ...RATE_LIMITS[type] };
  
  if (role === 'admin') {
    return {
      ...config,
      maxRequests: Math.min(config.maxRequests * 3, 1000)
    };
  } else if (role === 'manager') {
    return {
      ...config,
      maxRequests: Math.min(config.maxRequests * 2, 1000)
    };
  }
  
  return config;
}
