// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/file-tracking-test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-next-auth-secret';

// Rate limiting for tests
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';

// API configuration
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api';

// Disable logging in test environment
process.env.LOG_LEVEL = 'error';
