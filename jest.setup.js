// Set environment variables for testing
process.env.JWT_SECRET = 'test-secret-key-with-min-32-chars-123456';
process.env.NODE_ENV = 'test';

// Import jest first
import { jest } from '@jest/globals';

// Create simple NextResponse mock before any imports
class MockNextResponse {
  constructor(body, init = {}) {
    this._body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Headers(init.headers);
    this.ok = this.status >= 200 && this.status < 300;
    
    // Use Object.defineProperty to avoid read-only property error
    Object.defineProperty(this, 'cookies', {
      value: {
        set: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
      },
      writable: true,
      enumerable: true,
      configurable: true
    });
  }

  async json() {
    if (this._body === null || this._body === undefined) {
      return undefined;
    }
    if (typeof this._body === 'string') {
      return JSON.parse(this._body);
    }
    return this._body;
  }

  async text() {
    if (typeof this._body === 'object') {
      return JSON.stringify(this._body);
    }
    return this._body || '';
  }

  clone() {
    return new MockNextResponse(this._body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers
    });
  }

  static json(data, init = {}) {
    const response = new MockNextResponse(null, {
      status: init?.status || 200,
      statusText: init?.statusText || 'OK',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {})
      },
      ...init
    });
    // Explicitly set the body data for JSON responses
    response._body = data;
    return response;
  }

  static redirect(url, init = {}) {
    return new MockNextResponse(null, {
      status: init?.status || 302,
      headers: {
        Location: url,
        ...(init?.headers || {})
      },
      ...init
    });
  }
}

// Mock next/server before any other imports
jest.mock('next/server', () => ({
  NextRequest: class {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input?.url || '';
      this.method = (init?.method || 'GET').toUpperCase();
      this.headers = new Headers(init?.headers);
      this._body = init?.body;
    }
    async json() {
      return this._body ? JSON.parse(this._body) : {};
    }
    async text() {
      return this._body || '';
    }
    async formData() {
      return this._body;
    }
  },
  NextResponse: MockNextResponse
}));

// Set global NextResponse
global.NextResponse = MockNextResponse;

// Import required Node.js utilities
import { TextEncoder, TextDecoder } from 'util';
import '@testing-library/jest-dom';

// Polyfill for TextEncoder and TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Mock Request class for NextRequest compatibility
class MockRequest {
  constructor(input, init = {}) {
    // Use Object.defineProperty to set url as a getter to avoid read-only property error
    Object.defineProperty(this, 'url', {
      value: typeof input === 'string' ? input : input?.url || '',
      writable: false,
      enumerable: true,
      configurable: true
    });
    this.method = (init?.method || 'GET').toUpperCase();
    this.headers = new Headers(init?.headers);
    this._body = init?.body;
  }

  async json() {
    if (this._body) {
      return JSON.parse(this._body);
    }
    return {};
  }

  async text() {
    return this._body || '';
  }
}

// Set global Request
global.Request = MockRequest;

// Set global Response
global.Response = MockNextResponse;

// Mock Next.js router
jest.mock('next/router', () => require('next-router-mock'));

// Mock Next.js navigation
global.jest = jest;

// Mock window.scrollTo
const mockScrollTo = jest.fn();
window.scrollTo = mockScrollTo;

global.scrollTo = mockScrollTo;

// Mock fetch
global.fetch = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: () => ({
    data: null,
    status: 'unauthenticated',
  }),
  getSession: jest.fn(),
  getCsrfToken: jest.fn(),
  getProviders: jest.fn(),
}));

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
}));


// Mock audit operations
jest.mock('@/lib/audit-operations', () => ({
  AuditOperations: {
    createLog: jest.fn().mockResolvedValue(true),
    getDb: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'test-id' }),
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      })
    })
  }
}));


// Mock user operations to use test database
jest.mock('@/lib/user-operations', () => {
  const { ObjectId } = require('mongodb');
  
  // Create a factory function that will be called when the module is imported
  const createUserOperations = () => {
    let testDb = null;
    
    // Try to get test database when methods are called
    const getDb = () => {
      if (!testDb) {
        try {
          // Import test helpers dynamically when needed
          const testHelpers = require('./tests/utils/test-helpers');
          testDb = testHelpers.getTestDb();
        } catch (error) {
          // If test helpers not available, return a mock database
          testDb = {
            collection: () => ({
              insertOne: jest.fn().mockResolvedValue({ insertedId: new ObjectId() }),
              findOne: jest.fn().mockResolvedValue(null),
            })
          };
        }
      }
      return testDb;
    };
    
    return {
      UserOperations: {
        async createUser(userData) {
          const db = getDb();
          const user = {
            ...userData,
            _id: new ObjectId(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const result = await db.collection("users").insertOne(user);
          return result.insertedId;
        },
        
        async getUserByEmail(email) {
          const db = getDb();
          return await db.collection("users").findOne({ email });
        },
        
        async getUserById(id) {
          const db = getDb();
          return await db.collection("users").findOne({ _id: new ObjectId(id) });
        },
      }
    };
  };
  
  return createUserOperations();
});

// Mock rate limiter
jest.mock('@/lib/rate-limiter', () => ({
  RATE_LIMITS: {
    AUTH: { windowMs: 300000, maxRequests: 10 },
    GENERAL: { windowMs: 60000, maxRequests: 100 },
    UPLOAD: { windowMs: 60000, maxRequests: 20 },
  },
  checkRateLimit: jest.fn().mockResolvedValue({
    allowed: true,
    remaining: 10,
    resetTime: Date.now() + 300000,
  }),
  defaultKeyGenerator: jest.fn().mockReturnValue('test-key'),
  roleBasedKeyGenerator: jest.fn().mockReturnValue('test-key'),
  rateLimiter: { consume: jest.fn().mockResolvedValue(true) },
}));

// Mock rate limit middleware
jest.mock('@/lib/middleware/rate-limit', () => ({
  rateLimiter: jest.fn().mockResolvedValue(true),
  checkRateLimit: jest.fn().mockResolvedValue({ success: true }),
  withRateLimit: (handler) => handler,
  rateLimit: () => (handler) => handler,
  withAuthAndRateLimit: (handler) => handler,
}));

// Mock file operations
jest.mock('@/lib/file-operations', () => ({
  FileOperations: {
    uploadFile: jest.fn().mockResolvedValue({
      success: true,
      file: {
        _id: 'test-file-id',
        filename: 'test.txt',
        originalName: 'test.txt',
        size: 1024,
        mimeType: 'text/plain',
        uploadedBy: 'test-user-id',
        uploadedAt: new Date(),
        status: 'pending'
      }
    }),
    getUserFiles: jest.fn().mockResolvedValue([]),
    deleteFile: jest.fn().mockResolvedValue({ success: true }),
    approveFile: jest.fn().mockResolvedValue({ success: true }),
    downloadFile: jest.fn().mockResolvedValue({ success: true, filePath: '/tmp/test.txt' }),
    shareFile: jest.fn().mockResolvedValue({ success: true, shareId: 'test-share-id' }),
    getFileById: jest.fn().mockResolvedValue(null),
  }
}));

// Mock search operations
jest.mock('@/lib/search-operations', () => ({
  SearchOperations: {
    searchFiles: jest.fn().mockResolvedValue({
      files: [],
      total: 0,
      page: 1,
      totalPages: 0
    }),
    advancedSearch: jest.fn().mockResolvedValue({
      files: [],
      total: 0,
      page: 1,
      totalPages: 0
    }),
    saveSearch: jest.fn().mockResolvedValue({ success: true, searchId: 'test-search-id' }),
    getSavedSearches: jest.fn().mockResolvedValue([]),
    getSearchSuggestions: jest.fn().mockResolvedValue([])
  }
}));

// Mock notification operations
jest.mock('@/lib/notification-operations', () => ({
  getUserNotifications: jest.fn().mockResolvedValue([
    { _id: 'test-id', message: 'Test notification', read: false, createdAt: new Date() }
  ]),
  createNotification: jest.fn().mockResolvedValue({ success: true, notificationId: 'test-id' }),
  markNotificationAsRead: jest.fn().mockResolvedValue({ success: true }),
  markAllNotificationsAsRead: jest.fn().mockResolvedValue({ success: true, updatedCount: 5 }),
  deleteNotification: jest.fn().mockResolvedValue({ success: true }),
  getUnreadCount: jest.fn().mockResolvedValue(3),
  getUnreadNotificationCount: jest.fn().mockResolvedValue(3),
  getUserPreferences: jest.fn().mockResolvedValue({ email: true, push: true }),
  updateUserPreferences: jest.fn().mockResolvedValue({ success: true, preferences: {} }),
}));

// Mock admin operations
jest.mock('@/lib/admin-operations', () => ({
  AdminOperations: {
    getStats: jest.fn().mockResolvedValue({
      totalUsers: 10,
      totalFiles: 50,
      pendingFiles: 5,
      storageUsed: 1024000
    }),
    getAllUsers: jest.fn().mockResolvedValue([]),
    updateUser: jest.fn().mockResolvedValue({ success: true }),
    deleteUser: jest.fn().mockResolvedValue({ success: true }),
    bulkApproveFiles: jest.fn().mockResolvedValue({ success: true, approvedCount: 5 })
  }
}));

// Mock auth middleware
jest.mock('@/lib/middleware/auth', () => ({
  withAuth: (handler) => (req, context) => {
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'user',
      name: 'Test User'
    };
    return handler(req, context);
  },
  withAuthAndRole: (handler, roles) => (req, context) => {
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: roles[0] || 'user',
      name: 'Test User'
    };
    return handler(req, context);
  },
}));

// Mock AuthService
jest.mock('@/lib/auth', () => {
  const { ObjectId } = require('mongodb');
  
  // Track registered emails to simulate existing user check
  const registeredEmails = new Set();
  
  return {
    AuthService: {
      async register(userData) {
        // Check if email already exists
        if (registeredEmails.has(userData.email)) {
          return null; // Registration fails for existing email
        }
        
        // Add email to registered set
        registeredEmails.add(userData.email);
        
        // Simulate successful registration
        const user = {
          id: new ObjectId().toString(),
          userId: new ObjectId().toString(),
          email: userData.email,
          name: userData.name,
          role: userData.role || 'user',
          department: userData.department
        };
        
        const token = 'mock-jwt-token';
        
        return {
          user,
          token
        };
      },
      
      async login(email, password) {
        // Simulate successful login for test users
        if (email === 'test@example.com' && password === 'password123') {
          const user = {
            id: new ObjectId().toString(),
            userId: new ObjectId().toString(),
            email: email,
            name: 'Test User',
            role: 'user'
          };
          
          const token = 'mock-jwt-token';
          
          return {
            user,
            token
          };
        }
        
        // Return null for invalid credentials
        return null;
      },
      
      async hashPassword(password) {
        return `hashed_${password}`;
      },
      
      async verifyPassword(password, hashedPassword) {
        return hashedPassword === `hashed_${password}`;
      },
      
      async generateToken(user) {
        return 'mock-jwt-token';
      },
      
      async verifyToken(token) {
        if (token === 'mock-jwt-token') {
          return {
            id: new ObjectId().toString(),
            userId: new ObjectId().toString(),
            email: 'test@example.com',
            name: 'Test User',
            role: 'user'
          };
        }
        return null;
      }
    }
  };
});

// Mock console methods to keep test output clean
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress expected error messages in tests
  console.error = (...args) => {
    // Suppress specific expected error messages
    if (
      args.some(
        (arg) =>
          typeof arg === 'string' &&
          (arg.includes('Error: Uncaught') ||
            arg.includes('Error: connect ECONNREFUSED') ||
            arg.includes('Warning: An update to') ||
            arg.includes('Error: Not implemented: window.alert') ||
            arg.includes('Error: Not implemented: window.scroll'))
      )
    ) {
      return;
    }
    originalConsoleError(...args);
  };

  console.warn = (...args) => {
    // Suppress specific expected warning messages
    if (
      args.some(
        (arg) =>
          typeof arg === 'string' &&
          (arg.includes('componentWillReceiveProps') ||
            arg.includes('componentWillUpdate') ||
            arg.includes('Deprecation warning'))
      )
    ) {
      return;
    }
    originalConsoleWarn(...args);
  };
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

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

// Set up environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';