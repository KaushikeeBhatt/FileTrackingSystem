import { getDatabase } from "./mongodb"
import type { User, FileRecord, AuditLog, Notification } from "./models"
import { ObjectId } from "mongodb"

export class DatabaseOperations {
  private static async getDb() {
    return await getDatabase()
  }

  // User operations
  static async createUser(userData: Omit<User, "_id" | "createdAt" | "updatedAt">): Promise<ObjectId> {
    const db = await this.getDb()
    const user: User = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const result = await db.collection("users").insertOne(user)
    return result.insertedId
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const db = await this.getDb()
    return (await db.collection("users").findOne({ email })) as User | null
  }

  static async getUserById(id: string | ObjectId): Promise<User | null> {
    const db = await this.getDb()
    return (await db.collection("users").findOne({ _id: new ObjectId(id) })) as User | null
  }

  // File operations
  static async createFileRecord(fileData: Omit<FileRecord, "_id" | "createdAt" | "updatedAt">): Promise<ObjectId> {
    const db = await this.getDb()
    const file: FileRecord = {
      ...fileData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const result = await db.collection("files").insertOne(file)
    return result.insertedId
  }

  static async getFilesByUser(userId: string | ObjectId, limit = 50, skip = 0): Promise<FileRecord[]> {
    const db = await this.getDb()
    return (await db
      .collection("files")
      .find({ uploadedBy: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray()) as FileRecord[]
  }

  static async searchFiles(query: string, filters: any = {}, limit = 50): Promise<FileRecord[]> {
    const db = await this.getDb()
    const searchQuery = {
      $and: [
        {
          $or: [
            { fileName: { $regex: query, $options: "i" } },
            { originalName: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
            { tags: { $in: [new RegExp(query, "i")] } },
          ],
        },
        filters,
      ],
    }

    return (await db
      .collection("files")
      .find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()) as FileRecord[]
  }

  // Audit operations
  static async createAuditLog(auditData: Omit<AuditLog, "_id" | "timestamp">): Promise<ObjectId> {
    const db = await this.getDb()
    const audit: AuditLog = {
      ...auditData,
      timestamp: new Date(),
    }
    const result = await db.collection("audit_logs").insertOne(audit)
    return result.insertedId
  }

  static async getAuditLogs(filters: any = {}, limit = 100, skip = 0): Promise<AuditLog[]> {
    const db = await this.getDb()
    return (await db
      .collection("audit_logs")
      .find(filters)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .toArray()) as AuditLog[]
  }

  // Notification operations
  static async createNotification(notificationData: Omit<Notification, "_id" | "createdAt">): Promise<ObjectId> {
    const db = await this.getDb()
    const notification: Notification = {
      ...notificationData,
      createdAt: new Date(),
    }
    const result = await db.collection("notifications").insertOne(notification)
    return result.insertedId
  }

  static async getUserNotifications(userId: string | ObjectId, unreadOnly = false): Promise<Notification[]> {
    const db = await this.getDb()
    const query: any = { userId: new ObjectId(userId) }
    if (unreadOnly) {
      query.isRead = false
    }

    return (await db.collection("notifications").find(query).sort({ createdAt: -1 }).toArray()) as Notification[]
  }
}
