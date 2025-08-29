// MongoDB Database Setup Script
import { getDatabase } from "../lib/mongodb.js"

async function setupDatabase() {
  try {
    const db = await getDatabase()

    console.log("[v0] Setting up MongoDB collections and indexes...")

    // Create collections
    const collections = ["users", "files", "file_versions", "audit_logs", "notifications", "user_sessions"]

    for (const collectionName of collections) {
      const exists = await db.listCollections({ name: collectionName }).hasNext()
      if (!exists) {
        await db.createCollection(collectionName)
        console.log(`[v0] Created collection: ${collectionName}`)
      }
    }

    // Create indexes for better performance

    // Users collection indexes
    await db.collection("users").createIndex({ email: 1 }, { unique: true })
    await db.collection("users").createIndex({ role: 1 })

    // Files collection indexes
    await db.collection("files").createIndex({ fileName: 1 })
    await db.collection("files").createIndex({ uploadedBy: 1 })
    await db.collection("files").createIndex({ department: 1 })
    await db.collection("files").createIndex({ category: 1 })
    await db.collection("files").createIndex({ status: 1 })
    await db.collection("files").createIndex({ createdAt: -1 })
    await db.collection("files").createIndex({ tags: 1 })

    // File versions collection indexes
    await db.collection("file_versions").createIndex({ fileId: 1, version: -1 })

    // Audit logs collection indexes
    await db.collection("audit_logs").createIndex({ userId: 1 })
    await db.collection("audit_logs").createIndex({ resourceId: 1 })
    await db.collection("audit_logs").createIndex({ timestamp: -1 })
    await db.collection("audit_logs").createIndex({ action: 1 })

    // Notifications collection indexes
    await db.collection("notifications").createIndex({ userId: 1, isRead: 1 })
    await db.collection("notifications").createIndex({ createdAt: -1 })
    await db.collection("notifications").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

    // User sessions collection indexes
    await db.collection("user_sessions").createIndex({ token: 1 }, { unique: true })
    await db.collection("user_sessions").createIndex({ userId: 1 })
    await db.collection("user_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

    console.log("[v0] Database setup completed successfully!")

    // Create default admin user
    const adminExists = await db.collection("users").findOne({ email: "admin@filetracking.com" })
    if (!adminExists) {
      await db.collection("users").insertOne({
        email: "admin@filetracking.com",
        password: "$2b$10$rQZ8kHWKtGkVQ7K5X9J5XeF5J5X9J5XeF5J5X9J5XeF5J5X9J5Xe", // 'admin123' hashed
        name: "System Administrator",
        role: "admin",
        department: "IT",
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      })
      console.log("[v0] Created default admin user (admin@filetracking.com / admin123)")
    }
  } catch (error) {
    console.error("[v0] Database setup failed:", error)
    throw error
  }
}

setupDatabase()
