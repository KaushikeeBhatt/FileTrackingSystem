// Set environment variables for testing
process.env.JWT_SECRET = 'test-secret-key-with-min-32-chars-123456';
process.env.NODE_ENV = 'test';

// Import required Node.js utilities
import { TextEncoder, TextDecoder } from 'util';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Polyfill for TextEncoder and TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: class {
    constructor(input, init) {
      this.url = input?.url || '';
      this.method = (init?.method || 'GET').toUpperCase();
      this.headers = new Headers(init?.headers);
    }
  },
  NextResponse: {
    json: (data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: new Headers(init?.headers)
    })
  }
}));

// Mock Next.js router
jest.mock('next/router', () => require('next-router-mock'));

// Mock Next.js navigation
global.jest = jest;

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock fetch
global.fetch = jest.fn();

// Store the original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Override console methods to filter out common warnings in tests
console.error = (message) => {
  if (typeof message === 'string' && 
      (message.includes('Using the `next/future/image`') ||
       message.includes('Error: Not implemented: window.scrollTo'))) {
    return;
  }
  originalConsoleError(message);
};

console.warn = (message) => {
  if (typeof message === 'string' && 
      message.includes('Using the `next/future/image`')) {
    return;
  }
  originalConsoleWarn(message);
};

// Log test information
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  // Clean up any resources or mocks after each test
  jest.clearAllMocks();
});

// Set test timeout
jest.setTimeout(30000);

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => {
  const originalModule = jest.requireActual('next-auth/react');
  const mockSession = {
    data: {},
    status: 'unauthenticated',
  };
  return {
    __esModule: true,
    ...originalModule,
    useSession: jest.fn(() => ({
      ...mockSession,
    })),
    getSession: jest.fn(() => Promise.resolve(mockSession)),
  };
});

// Set up environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';