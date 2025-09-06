import type { NextRequest } from "next/server";
import { createClient } from 'redis';

interface RateLimitConfig {
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
  const ip = defaultKeyGenerator(request);
  
  if (user) {
    return `${user.role || 'user'}:${user.id}:${ip}`;
  }
  
  return ip;
}

// Create Redis client
const redisClient = process.env.NODE_ENV === 'test' 
  ? {
      get: async () => null,
      set: async () => 'OK',
      incr: async () => 1,
      expire: async () => 1,
      ttl: async () => 300,
    }
  : createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

// Connect to Redis
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      await (redisClient as any).connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  })();
}

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
    // Get the current count from Redis
    const redisKey = `rate_limit:${key}`;
    const count = await redisClient.get(redisKey);
    
    const currentCount = count ? parseInt(count, 10) : 0;
    
    // If this is a new window or the key doesn't exist
    if (!count || currentCount === 0) {
      await Promise.all([
        redisClient.set(redisKey, '1'),
        redisClient.expire(redisKey, Math.ceil(windowMs / 1000)),
      ]);
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime,
      };
    }
    
    // Increment the counter
    const newCount = await redisClient.incr(redisKey);
    
    const allowed = newCount <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - newCount);
    
    return {
      allowed,
      remaining,
      resetTime: now + (await redisClient.ttl(redisKey)) * 1000,
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

export type { RateLimitConfig };
