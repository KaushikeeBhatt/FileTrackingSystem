import { MongoClient, Db, ObjectId } from 'mongodb';

// Local MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-file-tracking';
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
    client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
      maxPoolSize: 10,
    });
    
    await client.connect();
    console.log('Connected to local MongoDB at', MONGODB_URI);
    
    // Set up test collections if they don't exist
    const db = client.db();
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const requiredCollections = ['files', 'users', 'audit', 'notifications'];
    for (const coll of requiredCollections) {
      if (!collectionNames.includes(coll)) {
        await db.createCollection(coll);
      }
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
      await client.close();
      client = undefined as unknown as MongoClient;
      console.log('MongoDB connection closed');
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
  }
  
  const db = getTestDb();
  const collections = await db.collections();
  
  await Promise.all(
    collections.map(collection => collection.deleteMany({}))
  );
  
  // Reset any test data or mocks
  process.env = {
    ...process.env,
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-key-with-min-32-chars-123456',
  };
};

// Helper to create a test user
export const createTestUser = async (userData: Partial<any> = {}) => {
  const db = getTestDb();
  const user = {
    _id: new ObjectId(),
    email: 'test@example.com',
    password: '$2a$10$XFD9z1aTZx5D5q6vQ8Qz0e8v8Q8X8vQ8Q8vQ8Q8vQ8Q8vQ8Q8',
    name: 'Test User',
    role: 'user',
    department: 'test',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...userData,
  };
  
  await db.collection('users').insertOne(user);
  return user;
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
