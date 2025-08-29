import { MongoClient } from "mongodb"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

export const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    email: "test@example.com",
    password: await bcrypt.hash("password123", 10),
    name: "Test User",
    role: "user",
    createdAt: new Date(),
    ...overrides,
  }

  return defaultUser
}

export const createTestAdmin = async () => {
  return createTestUser({
    email: "admin@example.com",
    role: "admin",
    name: "Test Admin",
  })
}

export const generateTestToken = (userId: string, role = "user") => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: "1h" })
}

export const createTestFile = (overrides = {}) => {
  return {
    filename: "test-file.pdf",
    originalName: "test-file.pdf",
    mimeType: "application/pdf",
    size: 1024,
    owner: "test-user-id",
    status: "pending",
    uploadDate: new Date(),
    description: "Test file description",
    tags: ["test", "document"],
    ...overrides,
  }
}

export const setupTestDatabase = async () => {
  const client = new MongoClient(process.env.MONGODB_URI!)
  await client.connect()
  const db = client.db()

  // Create test collections with indexes
  await db.createCollection("users")
  await db.createCollection("files")
  await db.createCollection("auditLogs")

  await db.collection("users").createIndex({ email: 1 }, { unique: true })
  await db.collection("files").createIndex({ owner: 1 })

  return { client, db }
}

export const cleanupTestDatabase = async (client: MongoClient) => {
  const db = client.db()
  const collections = await db.listCollections().toArray()

  for (const collection of collections) {
    await db.collection(collection.name).deleteMany({})
  }

  await client.close()
}
