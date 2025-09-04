// tests/utils/test-helpers.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { hash } from 'bcryptjs';

let mongoServer: MongoMemoryServer;
let client: MongoClient;

export const createTestUser = async (overrides = {}) => {
  const hashedPassword = await hash('password123', 10);
  return {
    email: `test-${Date.now()}@example.com`,
    password: hashedPassword,
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
};

export const setupTestDatabase = async () => {
  try {
    // Create a new MongoDB Memory Server instance
    mongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27017, // Use default MongoDB port
        dbPath: './.data/db',
        storageEngine: 'wiredTiger',
      },
      binary: {
        version: '6.0.14',
      },
    });

    const uri = mongoServer.getUri();
    client = new MongoClient(uri);
    await client.connect();

    // Set environment variables for the test database
    process.env.MONGODB_URI = uri;
    process.env.JWT_SECRET = 'test-secret';
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';

    return { client, db: client.db() };
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
};

export const cleanupTestDatabase = async () => {
  try {
    if (client) {
      await client.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Error cleaning up test database:', error);
    throw error;
  }
};