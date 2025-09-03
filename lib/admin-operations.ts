import { getDatabase } from "./mongodb"
import { ObjectId } from "mongodb"
import { AuthService } from "./auth"

export interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalFiles: number
  totalStorage: number
  pendingApprovals: number
  recentActivity: number
  systemHealth: {
    database: "healthy" | "warning" | "error"
    storage: "healthy" | "warning" | "error"
    performance: "healthy" | "warning" | "error"
  }
}

export interface UserManagement {
  _id: string
  name: string
  email: string
  role: string
  department: string
  isActive: boolean
  createdAt: Date
  lastLogin?: Date
  fileCount: number
  storageUsed: number
}

export class AdminOperations {
  private static async getDb() {
    return await getDatabase()
  }

  static async getSystemStats(): Promise<SystemStats> {
    const db = await this.getDb()

    // Get user stats
    const userStats = await db
      .collection("users")
      .aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: { $sum: { $cond: ["$isActive", 1, 0] } },
          },
        },
      ])
      .toArray()

    // Get file stats
    const fileStats = await db
      .collection("files")
      .aggregate([
        {
          $group: {
            _id: null,
            totalFiles: { $sum: 1 },
            totalStorage: { $sum: "$fileSize" },
            pendingApprovals: { $sum: { $cond: [{ $eq: ["$status", "pending_approval"] }, 1, 0] } },
          },
        },
      ])
      .toArray()

    // Get recent activity (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const recentActivity = await db.collection("audit_logs").countDocuments({
      timestamp: { $gte: yesterday },
    })

    // System health checks (simplified)
    const systemHealth = {
      database: "healthy" as const,
      storage: "healthy" as const,
      performance: "healthy" as const,
    }

    return {
      totalUsers: userStats[0]?.totalUsers || 0,
      activeUsers: userStats[0]?.activeUsers || 0,
      totalFiles: fileStats[0]?.totalFiles || 0,
      totalStorage: fileStats[0]?.totalStorage || 0,
      pendingApprovals: fileStats[0]?.pendingApprovals || 0,
      recentActivity,
      systemHealth,
    }
  }

  static async getAllUsers(limit = 50, skip = 0): Promise<{ users: UserManagement[]; total: number }> {
    const db = await this.getDb()

    const pipeline = [
      {
        $lookup: {
          from: "files",
          localField: "_id",
          foreignField: "uploadedBy",
          as: "files",
        },
      },
      {
        $lookup: {
          from: "audit_logs",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$userId", "$$userId"] }, action: "login" } },
            { $sort: { timestamp: -1 } },
            { $limit: 1 },
          ],
          as: "lastLogin",
        },
      },
      {
        $addFields: {
          fileCount: { $size: "$files" },
          storageUsed: { $sum: "$files.fileSize" },
          lastLogin: { $arrayElemAt: ["$lastLogin.timestamp", 0] },
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          department: 1,
          isActive: 1,
          createdAt: 1,
          lastLogin: 1,
          fileCount: 1,
          storageUsed: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]

    // Get total count
    const countPipeline = [...pipeline, { $count: "total" }]
    const countResult = await db.collection("users").aggregate(countPipeline).toArray()
    const total = countResult[0]?.total || 0

    // Add pagination
    const users = await db
      .collection("users")
      .aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: limit }
      ])
      .toArray()

    return {
      users: users as UserManagement[],
      total,
    }
  }

  static async createUser(userData: {
    name: string
    email: string
    password: string
    role: "admin" | "manager" | "user"
    department: string
  }): Promise<ObjectId> {
    const db = await this.getDb()

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ email: userData.email })
    if (existingUser) {
      throw new Error("User with this email already exists")
    }

    // Hash password
    const hashedPassword = await AuthService.hashPassword(userData.password)

    const user = {
      ...userData,
      password: hashedPassword,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("users").insertOne(user)
    return result.insertedId
  }

  static async updateUser(
    userId: string,
    updates: {
      name?: string
      email?: string
      role?: "admin" | "manager" | "user"
      department?: string
      isActive?: boolean
    },
  ): Promise<boolean> {
    const db = await this.getDb()

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      },
    )

    return result.modifiedCount > 0
  }

  static async deleteUser(userId: string): Promise<boolean> {
    const db = await this.getDb()

    // Soft delete - deactivate user instead of removing
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        },
      },
    )

    return result.modifiedCount > 0
  }

  static async bulkApproveFiles(fileIds: string[], approvedBy: string): Promise<number> {
    const db = await this.getDb()

    const objectIds = fileIds.map((id) => new ObjectId(id))

    const result = await db.collection("files").updateMany(
      { _id: { $in: objectIds }, status: "pending_approval" },
      {
        $set: {
          status: "active",
          approvedBy: new ObjectId(approvedBy),
          approvedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    )

    // Create audit logs for bulk approval
    const auditLogs = fileIds.map((fileId) => ({
      userId: new ObjectId(approvedBy),
      action: "approve",
      resourceType: "file",
      resourceId: new ObjectId(fileId),
      details: { bulkOperation: true },
      timestamp: new Date(),
      success: true,
    }))

    if (auditLogs.length > 0) {
      await db.collection("audit_logs").insertMany(auditLogs)
    }

    return result.modifiedCount
  }

  static async bulkDeleteFiles(fileIds: string[], deletedBy: string): Promise<number> {
    const db = await this.getDb()

    const objectIds = fileIds.map((id) => new ObjectId(id))

    const result = await db.collection("files").updateMany(
      { _id: { $in: objectIds } },
      {
        $set: {
          status: "archived",
          updatedAt: new Date(),
        },
      },
    )

    // Create audit logs for bulk deletion
    const auditLogs = fileIds.map((fileId) => ({
      userId: new ObjectId(deletedBy),
      action: "delete",
      resourceType: "file",
      resourceId: new ObjectId(fileId),
      details: { bulkOperation: true },
      timestamp: new Date(),
      success: true,
    }))

    if (auditLogs.length > 0) {
      await db.collection("audit_logs").insertMany(auditLogs)
    }

    return result.modifiedCount
  }

  static async getSystemAnalytics(days = 30): Promise<any> {
    const db = await this.getDb()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // File upload trends
    const uploadTrends = await db
      .collection("files")
      .aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            uploads: { $sum: 1 },
            totalSize: { $sum: "$fileSize" },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray()

    // User activity trends
    const activityTrends = await db
      .collection("audit_logs")
      .aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            actions: { $sum: 1 },
            uniqueUsers: { $addToSet: "$userId" },
          },
        },
        {
          $project: {
            date: "$_id",
            actions: 1,
            uniqueUsers: { $size: "$uniqueUsers" },
          },
        },
        { $sort: { date: 1 } },
      ])
      .toArray()

    // Department statistics
    const departmentStats = await db
      .collection("files")
      .aggregate([
        {
          $group: {
            _id: "$department",
            fileCount: { $sum: 1 },
            totalSize: { $sum: "$fileSize" },
          },
        },
        { $sort: { fileCount: -1 } },
      ])
      .toArray()

    // File type distribution
    const fileTypeStats = await db
      .collection("files")
      .aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            totalSize: { $sum: "$fileSize" },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray()

    return {
      uploadTrends,
      activityTrends,
      departmentStats,
      fileTypeStats,
    }
  }
}
