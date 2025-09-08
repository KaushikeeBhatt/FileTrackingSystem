import { MongoClient, Db, ObjectId, Collection } from 'mongodb';

// Local MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/test-file-tracking';
const TEST_DB_NAME = 'test-file-tracking';
let client: MongoClient;

// Set test environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-with-min-32-chars-123456';
process.env.MONGODB_URI = MONGODB_URI;

// Mock NextResponse
export class MockNextResponse {
  statusCode: number;
  body: any;
  headers: Headers;

  constructor() {
    this.statusCode = 200;
    this.body = null;
    this.headers = new Headers();
  }

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: any) {
    this.body = data;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers.set(name, value);
    return this;
  }
}

// Mock NextRequest
export class MockNextRequest {
  method: string;
  url: string;
  headers: Headers;
  user: any;
  body: any;

  constructor(url: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new Headers(options.headers);
    this.user = { id: new ObjectId(), role: 'user' };
    this.body = options.body;
  }

  json() {
    return Promise.resolve(this.body);
  }

  formData() {
    return Promise.resolve(this.body);
  }
}

export const setupTestDatabase = async () => {
  if (client) {
    return client;
  }

  try {
    // Connect to local MongoDB
    client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
      maxPoolSize: 10,
    });
    
    await client.connect();
    
    // Get the test database
    const db = client.db(TEST_DB_NAME);
    
    // Clear all collections instead of dropping database
    const collections = ['files', 'users', 'audit', 'notifications', 'audit_logs', 'email_logs', 'notification_preferences'];
    
    for (const collectionName of collections) {
      try {
        await db.collection(collectionName).deleteMany({});
      } catch (error) {
        // Collection might not exist, create it
        try {
          await db.createCollection(collectionName);
        } catch (createError) {
          // Collection already exists, ignore
        }
      }
    }
    
    // Set up initial test data with unique email per test run
    const users = db.collection('users');
    const uniqueEmail = `test-${Date.now()}@example.com`;
    
    try {
      await users.insertOne({
        _id: new ObjectId(),
        email: uniqueEmail,
        password: 'hashedpassword',
        role: 'user',
        name: 'Test User',
        department: 'test',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to create initial test user:', error);
      // Continue without initial user - tests can create their own
    }
    
    return client;
  } catch (error) {
    console.error('Failed to connect to local MongoDB:', error);
    throw error;
  }
};

export const stopTestDatabase = async () => {
  try {
    if (client) {
      // Clean up test database
      const db = client.db(TEST_DB_NAME);
      await db.dropDatabase();
      
      // Close the connection
      await client.close();
      client = undefined as unknown as MongoClient;
      console.log('MongoDB connection closed and test database dropped');
    }
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

export const getTestDb = (dbName = 'test-file-tracking'): Db => {
  if (!client) {
    throw new Error('Database not initialized. Call setupTestDatabase first.');
  }
  return client.db(dbName);
};

// Clean all collections in the test database
export const cleanTestDb = async (): Promise<void> => {
  if (!client) {
    await setupTestDatabase();
    return;
  }
  
  const db = client.db(TEST_DB_NAME);
  
  try {
    // Clear all collections instead of dropping database
    const collections = ['files', 'users', 'audit', 'notifications', 'audit_logs', 'email_logs', 'notification_preferences'];
    
    for (const collectionName of collections) {
      try {
        await db.collection(collectionName).deleteMany({});
      } catch (error) {
        // Collection might not exist, create it
        try {
          await db.createCollection(collectionName);
        } catch (createError) {
          // Collection already exists, ignore
        }
      }
    }
    
    // Recreate indexes
    await db.collection('files').createIndex({ fileName: 1 });
    await db.collection('files').createIndex({ 'metadata.tags': 1 });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('audit').createIndex({ timestamp: -1 });
  } catch (error) {
    console.error('Error cleaning test database:', error);
    throw error;
  }
};

// Helper to create a test user
export const createTestUser = async (userData: Partial<any> = {}) => {
  const db = getTestDb();
  const uniqueEmail = userData.email || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
  
  const user = {
    _id: new ObjectId(),
    email: uniqueEmail,
    password: '$2a$10$XFD9z1aTZx5D5q6vQ8Qz0e8v8Q8X8vQ8Q8vQ8Q8vQ8Q8vQ8Q8',
    name: 'Test User',
    role: 'user',
    department: 'test',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...userData,
  };
  
  try {
    await db.collection('users').insertOne(user);
    return user;
  } catch (error) {
    console.error('Failed to create test user:', error);
    throw error;
  }
};

// Helper to create a test file
export const createTestFile = async (fileData: Partial<any> = {}) => {
  const db = getTestDb();
  const file = {
    _id: new ObjectId(),
    fileName: 'test-file.txt',
    originalName: 'test-original.txt',
    fileType: 'text/plain',
    fileSize: 1024,
    uploadedBy: new ObjectId(),
    department: 'test',
    category: 'test',
    status: 'pending',
    tags: [],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...fileData,
  };
  
  await db.collection('files').insertOne(file);
  return file;
};

// Initialize and cleanup for tests
export const setupTestEnvironment = () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanTestDb();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });
};
