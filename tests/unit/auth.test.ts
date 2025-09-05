import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { getTestDb, cleanTestDb, setupTestDatabase } from '../utils/test-helpers';

let mongoServer: MongoMemoryServer;
let client: MongoClient;

beforeAll(async () => {
  // Create a temporary directory for MongoDB storage
  const tmpDir = mkdtempSync(join(tmpdir(), 'mongo-mem-'));
  
  // Create a new MongoDB Memory Server instance
  mongoServer = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbPath: tmpDir,
      storageEngine: 'wiredTiger',
    },
    binary: {
      version: '6.0.14',
    },
  });

  const uri = mongoServer.getUri();
  client = new MongoClient(uri);
  await client.connect();
  
  process.env.MONGODB_URI = uri;
  // Use a long, secure JWT secret to pass the validation check
  process.env.JWT_SECRET = 'a-very-secure-test-jwt-secret-for-testing';

  // Use type assertion for NODE_ENV
  (process.env as any).NODE_ENV = 'test';
});

afterAll(async () => {
  if (client) {
    await client.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Mock the rate limiter to avoid rate limiting in tests
jest.mock('@/lib/rate-limiter', () => ({
  rateLimiter: {
    consume: jest.fn().mockResolvedValue(true),
  },
}));

describe('Auth Module', () => {
  // Set up test database before all tests
  setupTestDatabase();

  test('should have JWT_SECRET configured', () => {
    const jwtSecret = process.env.JWT_SECRET;
    expect(jwtSecret).toBeDefined();
    expect(jwtSecret?.length).toBeGreaterThanOrEqual(32);
  });

  test('should connect to test database', async () => {
    const db = getTestDb();
    expect(db).toBeDefined();
    
    // Test database operations
    const testCollection = db.collection('testCollection');
    await testCollection.insertOne({ test: 'data' });
    
    const result = await testCollection.findOne({ test: 'data' });
    expect(result).toBeDefined();
    expect(result?.test).toBe('data');
  });

  test('should clean up test database between tests', async () => {
    const db = getTestDb();
    const testCollection = db.collection('testCleanup');
    
    // This should be a fresh database for this test
    const count = await testCollection.countDocuments();
    expect(count).toBe(0);
    
    // Insert a document
    await testCollection.insertOne({ test: 'cleanup' });
    
    // Verify it was inserted
    const insertedCount = await testCollection.countDocuments();
    expect(insertedCount).toBe(1);
  });
});
