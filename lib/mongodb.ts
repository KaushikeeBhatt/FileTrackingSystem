import { MongoClient, Db } from "mongodb"
import { validateEnvironment } from "./env-validation"
import { checkRateLimit, defaultKeyGenerator, getRateLimitConfig, RateLimitType, roleBasedKeyGenerator } from "./rate-limiter";
import { NextRequest, NextResponse } from "next/server";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

// Validate environment variables (skip during build phase)
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || process.env.DOCKER_BUILD === 'true';
const env = isBuildTime ? { isValid: true, config: null, errors: [] } : validateEnvironment();

if (!isBuildTime && (!env.isValid || !env.config)) {
  throw new Error(`Environment validation failed: ${env.errors?.join(', ')}`);
}

// Use dummy config during build time
const { config: envConfig } = env.config ? env : {
  config: {
    MONGODB_URI: 'mongodb://localhost:27017/build-placeholder',
    JWT_SECRET: 'build-time-secret-minimum-32-chars-required',
    NODE_ENV: 'production' as const,
    BASE_URL: 'http://localhost:3000',
    MAX_FILE_SIZE: 52428800,
    ALLOWED_FILE_TYPES: 'application/pdf,image/jpeg,image/png'
  }
};

// In test environment, we want to create a new connection for each test
const isTestEnvironment = process.env.NODE_ENV === 'test';

// Only create a global connection in non-test and non-build environments
if (!global._mongoClientPromise && !isTestEnvironment && !isBuildTime) {
  const client = new MongoClient(envConfig.MONGODB_URI);
  global._mongoClientPromise = client.connect()
    .then(connectedClient => {
      console.log("MongoDB connected successfully");
      return connectedClient;
    })
    .catch(error => {
      console.error("MongoDB connection error:", error);
      throw error;
    });
}

export const clientPromise = isTestEnvironment ? undefined : global._mongoClientPromise;

export async function getDatabase(dbName?: string): Promise<Db> {
  if (isTestEnvironment) {
    throw new Error('getDatabase() should not be called in test environment. Use test helpers instead.');
  }

  try {
    const client = await clientPromise;
    if (!client) {
      throw new Error('MongoDB client is not initialized');
    }
    return client.db(dbName);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw new Error(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  if (isTestEnvironment) return; // Let test environment handle cleanup
  
  try {
    const client = await global._mongoClientPromise;
    if (client) {
      await client.close();
      console.log("MongoDB connection closed.");
    }
  } catch (error) {
    console.error("Error closing MongoDB connection:", error);
    throw error;
  } finally {
    global._mongoClientPromise = undefined;
  }
}
// ... existing imports ...

export async function withRateLimit(
  handler: Function,
  limitType: RateLimitType = "GENERAL",
  useRoleBasedLimits = false,
) {
  return async (request: NextRequest, ...args: any[]) => {
    
      // Add CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    try{
      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, { headers: corsHeaders })
      }

      const user = (request as any).user
      const role = useRoleBasedLimits && user?.role
      const config = getRateLimitConfig(limitType, role)

      const keyGenerator = useRoleBasedLimits ? roleBasedKeyGenerator : defaultKeyGenerator
      const { allowed, remaining, resetTime } = await checkRateLimit(request, config, keyGenerator)

      if (!allowed) {
        const response = NextResponse.json(
          {
            success: false,
            error: "Rate limit exceeded",
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
          },
          { 
            status: 429,
            headers: corsHeaders
          }
        )

        response.headers.set("Retry-After", Math.ceil((resetTime - Date.now()) / 1000).toString())
        response.headers.set("X-RateLimit-Limit", config.maxRequests.toString())
        response.headers.set("X-RateLimit-Remaining", remaining.toString())
        response.headers.set("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString())

        return response
      }

      const response = await handler(request, ...args)

      if (response instanceof NextResponse) {
        // Add rate limit headers to all responses
        response.headers.set("X-RateLimit-Limit", config.maxRequests.toString())
        response.headers.set("X-RateLimit-Remaining", (remaining - 1).toString())
        response.headers.set("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString())
        
        // Add CORS headers
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value)
        })

        return response
      }

      return response
    } catch (error) {
      console.error("Rate limit middleware error:", error);
      return NextResponse.json(
        { success: false, error: "Internal server error" },
        { status: 500, headers: corsHeaders as Record<string, string> }
      );
    }
  }
}