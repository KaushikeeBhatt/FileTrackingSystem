import { MongoClient, Db } from "mongodb"
import { validateEnvironment } from "./env-validation"

declare global {
  var _mongoClientPromise: Promise<MongoClient>
}

const env = validateEnvironment()

if (!global._mongoClientPromise) {
  const client = new MongoClient(env.MONGODB_URI)
  global._mongoClientPromise = client.connect()
  console.log("New MongoDB connection promise created.")
}

export const clientPromise = global._mongoClientPromise

export async function getDatabase(): Promise<Db> {
  try {
    const client = await clientPromise
    console.log("Reusing existing MongoDB connection.")
    return client.db()
  } catch (error) {
    console.error("MongoDB connection error:", error)
    throw new Error(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  try {
    const client = await clientPromise
    await client.close()
    console.log("MongoDB connection closed")
  } catch (error) {
    console.error("Error closing MongoDB connection:", error)
  }
}