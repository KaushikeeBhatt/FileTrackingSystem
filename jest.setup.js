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

// Set test timeout
jest.setTimeout(60000);

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

// Set up environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-123';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
  })
);

// Mock console methods to reduce test noise
const consoleError = console.error;
const consoleWarn = console.warn;

beforeAll(() => {
  console.error = (message) => {
    if (!message.toString().includes('Error: Not implemented: window.scrollTo')) {
      consoleError(message);
    }
  };
  console.warn = (message) => {
    if (!message.toString().includes('Using the `next/future/image`')) {
      consoleWarn(message);
    }
  };
});

afterAll(() => {
  console.error = consoleError;
  console.warn = consoleWarn;
});