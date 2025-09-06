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

export function getRequiredEnvVar(name: string, customError?: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(customError || `Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOptionalEnvVar(name: string, defaultValue?: string): string | undefined {
    return process.env[name] || defaultValue;
}

export function validateJWTSecret(secret?: string): void {
    if (!secret) {
        throw new Error('JWT_SECRET is required');
    }
    if (secret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long');
    }
}

export function validateDatabaseURL(url?: string): void {
    if (!url) {
        throw new Error('MONGODB_URI is required');
    }
    if (!url.startsWith('mongodb://') && !url.startsWith('mongodb+srv://')) {
        throw new Error('MONGODB_URI must be a valid MongoDB connection string');
    }
}

export function validatePort(port?: string): void {
    if (!port) return; // Port is optional
    const portNum = parseInt(port, 10);
    if (isNaN(portNum)) {
        throw new Error('PORT must be a valid number');
    }
}

export function validateEnvironment(): { isValid: boolean; config: EnvConfig | null; errors: string[] } {
  const errors: string[] = [];
  const env = process.env;

  const requiredVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'NODE_ENV',
    'BASE_URL',
    'MAX_FILE_SIZE',
    'ALLOWED_FILE_TYPES'
  ];

  requiredVars.forEach(v => {
    if (!env[v]) {
      errors.push(`Missing required environment variable: ${v}`);
    }
  });

  try { validateJWTSecret(env.JWT_SECRET); } catch (e) { if (e instanceof Error) errors.push(e.message); }
  try { validateDatabaseURL(env.MONGODB_URI); } catch (e) { if (e instanceof Error) errors.push(e.message); }

  const validEnvironments = ['development', 'production', 'test'] as const;
  if (env.NODE_ENV && !validEnvironments.includes(env.NODE_ENV as any)) {
    errors.push(`NODE_ENV must be one of: ${validEnvironments.join(', ')}`);
  }

  const maxFileSize = parseInt(env.MAX_FILE_SIZE || '10485760', 10);
  if (isNaN(maxFileSize)) {
    errors.push('MAX_FILE_SIZE must be a valid number');
  }

  if (errors.length > 0) {
    return { isValid: false, config: null, errors };
  }

  return {
    isValid: true,
    errors: [],
    config: {
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
  };
}
