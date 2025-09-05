import { MongoClient, Db } from "mongodb"
import { validateEnvironment } from "./env-validation"

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

const env = validateEnvironment()

// In test environment, we want to create a new connection for each test
const isTestEnvironment = process.env.NODE_ENV === 'test';

// Only create a global connection in non-test environments
if (!global._mongoClientPromise && !isTestEnvironment) {
  const client = new MongoClient(env.MONGODB_URI)
  global._mongoClientPromise = client.connect()
    .then(connectedClient => {
      console.log("MongoDB connected successfully");
      return connectedClient;
    })
    .catch(error => {
      console.error("MongoDB connection error:", error);
      throw error;
    });
}

export const clientPromise = isTestEnvironment ? undefined : global._mongoClientPromise;

export async function getDatabase(dbName?: string): Promise<Db> {
  if (isTestEnvironment) {
    throw new Error('getDatabase() should not be called in test environment. Use test helpers instead.');
  }

  try {
    const client = await clientPromise;
    if (!client) {
      throw new Error('MongoDB client is not initialized');
    }
    return client.db(dbName);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw new Error(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  if (isTestEnvironment) return; // Let test environment handle cleanup
  
  try {
    const client = await global._mongoClientPromise;
    if (client) {
      await client.close();
      console.log("MongoDB connection closed.");
    }
  } catch (error) {
    console.error("Error closing MongoDB connection:", error);
    throw error;
  } finally {
    global._mongoClientPromise = undefined;
  }
}