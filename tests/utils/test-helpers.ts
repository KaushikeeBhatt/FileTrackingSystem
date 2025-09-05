import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';

// Use type assertion for NODE_ENV to handle the read-only property
(process as any).NODE_ENV = 'test';

let mongoServer: MongoMemoryServer;
let client: MongoClient;

export const startTestDatabase = async () => {
  try {
    // Create a new MongoDB Memory Server instance
    mongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27017, // Use default port
        storageEngine: 'wiredTiger',
      },
      binary: {
        version: '6.0.14',
      }
    });

    const uri = mongoServer.getUri();
    client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
    
    await client.connect();
    
    // Set environment variables for the application
    process.env.MONGODB_URI = uri;
    process.env.JWT_SECRET = 'test-secret-key-with-min-32-chars-123456';
    process.env.NODE_ENV = 'test';
    
    console.log('Test MongoDB server started successfully at', uri);
    return client;
  } catch (error) {
    console.error('Failed to start test MongoDB server:', error);
    throw error;
  }
};

export const stopTestDatabase = async () => {
  try {
    if (client) {
      await client.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('Test MongoDB server stopped');
  } catch (error) {
    console.error('Error cleaning up test database:', error);
    throw error;
  }
};

// Get a fresh database instance for each test
export const getTestDb = (dbName = 'test'): Db => {
  if (!client) {
    throw new Error('MongoDB client is not initialized. Call startTestDatabase() first.');
  }
  return client.db(dbName);
};

// Clean all collections in the test database
export const cleanTestDb = async (): Promise<void> => {
  if (!client) return;
  
  const db = getTestDb();
  const collections = await db.collections();
  await Promise.all(
    collections.map(async (collection) => {
      try {
        await collection.deleteMany({});
      } catch (error) {
        console.error(`Error cleaning collection ${collection.collectionName}:`, error);
      }
    })
  );
};

// Initialize and cleanup for tests
export const setupTestDatabase = () => {
  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestDb();
  });
};
