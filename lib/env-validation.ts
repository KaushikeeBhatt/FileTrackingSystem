export interface EnvConfig {
  MONGODB_URI: string
  JWT_SECRET: string
  NODE_ENV: 'development' | 'production' | 'test'
  BASE_URL: string
  MAX_FILE_SIZE: number
  ALLOWED_FILE_TYPES: string
  ADMIN_EMAIL?: string
  ADMIN_PASSWORD?: string
  ADMIN_NAME?: string
}

export function validateEnvironment(): EnvConfig {
  const env = process.env
  
  const requiredVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'NODE_ENV',
    'BASE_URL',
    'MAX_FILE_SIZE',
    'ALLOWED_FILE_TYPES'
  ]

  const missing = requiredVars.filter(key => !env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  // Validate JWT Secret
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security')
  }

  // Validate NODE_ENV
  const validEnvironments = ['development', 'production', 'test'] as const
  if (!validEnvironments.includes(env.NODE_ENV as any)) {
    throw new Error(`NODE_ENV must be one of: ${validEnvironments.join(', ')}`)
  }

  // Parse MAX_FILE_SIZE
  const maxFileSize = parseInt(env.MAX_FILE_SIZE || '10485760', 10)
  if (isNaN(maxFileSize)) {
    throw new Error('MAX_FILE_SIZE must be a valid number')
  }

  // Validate MongoDB URI format
  if (env.MONGODB_URI && !/^mongodb:\/\//.test(env.MONGODB_URI)) {
    throw new Error('MONGODB_URI must start with mongodb://')
  }

  // Validate BASE_URL format
  if (env.BASE_URL && !/^https?:\/\//.test(env.BASE_URL)) {
    throw new Error('BASE_URL must start with http:// or https://')
  }

  return {
    MONGODB_URI: env.MONGODB_URI!,
    JWT_SECRET: env.JWT_SECRET!,
    NODE_ENV: env.NODE_ENV as 'development' | 'production' | 'test',
    BASE_URL: env.BASE_URL!,
    MAX_FILE_SIZE: maxFileSize,
    ALLOWED_FILE_TYPES: env.ALLOWED_FILE_TYPES!,
    ADMIN_EMAIL: env.ADMIN_EMAIL,
    ADMIN_PASSWORD: env.ADMIN_PASSWORD,
    ADMIN_NAME: env.ADMIN_NAME
  }
}
