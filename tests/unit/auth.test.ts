// tests/utils/test-helpers.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

let mongoServer: MongoMemoryServer;
let client: MongoClient;

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
        // Remove skipMD5 as it's not a valid option
      },
    });

    const uri = mongoServer.getUri();
    client = new MongoClient(uri);
    await client.connect();

    // Set environment variables for the test database
    process.env.MONGODB_URI = uri;
    process.env.JWT_SECRET = 'test-secret';
    // Use type assertion for NODE_ENV
    (process.env as any).NODE_ENV = 'test';

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