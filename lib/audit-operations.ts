import { getDatabase } from "./mongodb"
import { ObjectId, type Document } from "mongodb"
import type { AuditLog } from "./models/audit"

export interface AuditFilters {
  userId?: string
  action?: string
  resourceType?: string
  resourceId?: string
  dateFrom?: Date
  dateTo?: Date
  success?: boolean
}

export interface AuditStats {
  totalActions: number
  successfulActions: number
  failedActions: number
  uniqueUsers: number
  actionBreakdown: { action: string; count: number }[]
  dailyActivity: { date: string; count: number }[]
  topUsers: { user: string; count: number }[]
}

export class AuditOperations {
  private static async getDb() {
    return await getDatabase()
  }

  static async createLog(logData: Omit<AuditLog, '_id' | 'timestamp'>): Promise<ObjectId> {
    const db = await this.getDb()

    const auditEntry: AuditLog = {
      ...logData,
      timestamp: new Date(),
    }

    const result = await db.collection("audit_logs").insertOne(auditEntry)
    return result.insertedId
  }

  static async getAuditTrail(
    filters: AuditFilters,
    user: { id: string; role: string },
    limit = 100,
    skip = 0,
  ): Promise<{ logs: any[]; total: number }> {
    const db = await this.getDb()

    // Build match conditions
    const matchConditions: any = {}

    // Role-based filtering
    if (user.role === "user") {
      matchConditions.userId = new ObjectId(user.id)
    } else if (filters.userId) {
      matchConditions.userId = new ObjectId(filters.userId)
    }

    if (filters.action) {
      matchConditions.action = filters.action
    }

    if (filters.resourceType) {
      matchConditions.resourceType = filters.resourceType
    }

    if (filters.resourceId) {
      matchConditions.resourceId = new ObjectId(filters.resourceId)
    }

    if (filters.success !== undefined) {
      matchConditions.success = filters.success
    }

    if (filters.dateFrom || filters.dateTo) {
      matchConditions.timestamp = {}
      if (filters.dateFrom) {
        matchConditions.timestamp.$gte = filters.dateFrom
      }
      if (filters.dateTo) {
        matchConditions.timestamp.$lte = filters.dateTo
      }
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: matchConditions },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "files",
          localField: "resourceId",
          foreignField: "_id",
          as: "resource",
        },
      },
      {
        $addFields: {
          resource: { $arrayElemAt: ["$resource", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          action: 1,
          resourceType: 1,
          resourceId: 1,
          details: 1,
          timestamp: 1,
          success: 1,
          errorMessage: 1,
          "user._id": 1,
          "user.name": 1,
          "user.email": 1,
          "user.role": 1,
          "user.department": 1,
          "resource.originalName": 1,
          "resource.fileName": 1,
          "resource.category": 1,
        },
      },
      { $sort: { timestamp: -1 } },
    ]

    // Get total count
    const countPipeline = [...pipeline, { $count: "total" }]
    const countResult = await db.collection("audit_logs").aggregate(countPipeline).toArray()
    const total = countResult[0]?.total || 0

    // Add pagination
    pipeline.push({ $skip: skip }, { $limit: limit })

    // Execute query
    const logs = await db.collection("audit_logs").aggregate(pipeline).toArray()

    return { logs, total }
  }

  static async getAuditStats(filters: AuditFilters, userRole: string, userId?: string): Promise<AuditStats> {
    const db = await this.getDb()

    // Build match conditions
    const matchConditions: any = {}

    // Role-based filtering
    if (userRole === "user" && userId) {
      matchConditions.userId = new ObjectId(userId)
    }

    if (filters.dateFrom || filters.dateTo) {
      matchConditions.timestamp = {}
      if (filters.dateFrom) {
        matchConditions.timestamp.$gte = filters.dateFrom
      }
      if (filters.dateTo) {
        matchConditions.timestamp.$lte = filters.dateTo
      }
    }

    // Get basic stats
    const basicStats = await db
      .collection("audit_logs")
      .aggregate([
        { $match: matchConditions },
        {
          $group: {
            _id: null,
            totalActions: { $sum: 1 },
            successfulActions: { $sum: { $cond: ["$success", 1, 0] } },
            failedActions: { $sum: { $cond: ["$success", 0, 1] } },
            uniqueUsers: { $addToSet: "$userId" },
          },
        },
        {
          $project: {
            totalActions: 1,
            successfulActions: 1,
            failedActions: 1,
            uniqueUsers: { $size: "$uniqueUsers" },
          },
        },
      ])
      .toArray()

    // Get action breakdown with proper type annotation
    const actionBreakdown = await db
      .collection<AuditLog>("audit_logs")
      .aggregate<{ action: string; count: number }>([
        { $match: matchConditions },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { action: "$_id", count: 1, _id: 0 } },
      ])
      .toArray()

    // Get daily activity (last 30 days) with proper type annotation
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyActivity = await db
      .collection<AuditLog>("audit_logs")
      .aggregate<{ date: string; count: number }>([
        {
          $match: {
            ...matchConditions,
            timestamp: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", count: 1, _id: 0 } },
      ])
      .toArray()

    // Get top users (only for admin/manager)
    let topUsers: { user: string; count: number }[] = []
    if (userRole === "admin" || userRole === "manager") {
      const topUsersData = await db
        .collection("audit_logs")
        .aggregate<{ user: string; count: number }>([
          { $match: matchConditions },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: "$user" },
          { $group: { _id: "$user.name", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { user: "$_id", count: 1, _id: 0 } },
        ])
        .toArray()

      topUsers = topUsersData
    }

    return {
      totalActions: basicStats[0]?.totalActions || 0,
      successfulActions: basicStats[0]?.successfulActions || 0,
      failedActions: basicStats[0]?.failedActions || 0,
      uniqueUsers: basicStats[0]?.uniqueUsers || 0,
      actionBreakdown,
      dailyActivity,
      topUsers,
    }
  }

  static async exportAuditReport(
    filters: AuditFilters,
    user: { id: string; role: string },
    format: "csv" | "json" = "csv",
  ): Promise<string> {
    const { logs } = await this.getAuditTrail(filters, user, 10000, 0)

    if (format === "json") {
      return JSON.stringify(logs, null, 2)
    }

    // CSV format
    const headers = [
      "Timestamp",
      "User",
      "Action",
      "Resource Type",
      "Resource Name",
      "Success",
      "Details",
      "IP Address",
    ]

    const csvRows = [
      headers.join(","),
      ...logs.map((log) => [
        new Date(log.timestamp).toISOString(),
        log.user?.name || "Unknown",
        log.action,
        log.resourceType,
        log.resource?.originalName || log.details?.fileName || "",
        log.success ? "Success" : "Failed",
        JSON.stringify(log.details).replace(/"/g, '""'),
        log.details?.ipAddress || "",
      ]),
    ]

    return csvRows.map((row) => (Array.isArray(row) ? row.join(",") : row)).join("\n")
  }

  static async createDetailedAuditLog(
    userId: ObjectId,
    action: "upload" | "download" | "view" | "edit" | "delete" | "approve" | "reject" | "share",
    resourceType: "file" | "user" | "system",
    resourceId: ObjectId,
    details: any,
    success: boolean,
    request?: any,
    errorMessage?: string,
  ): Promise<ObjectId> {
    const db = await this.getDb()

    // Enhanced details with request information
    const enhancedDetails = {
      ...details,
      ipAddress: request?.ip || request?.headers?.["x-forwarded-for"] || "unknown",
      userAgent: request?.headers?.["user-agent"] || "unknown",
      timestamp: new Date(),
    }

    const audit: AuditLog = {
      userId,
      action,
      resourceType,
      resourceId,
      details: enhancedDetails,
      timestamp: new Date(),
      success,
      errorMessage,
    }

    const result = await db.collection("audit_logs").insertOne(audit)
    return result.insertedId
  }

  static async getRecentActivity(userId: string, userRole: string, limit = 20): Promise<any[]> {
    const db = await this.getDb()

    const matchConditions: any = {}
    if (userRole === "user") {
      matchConditions.userId = new ObjectId(userId)
    }

    return await db
      .collection("audit_logs")
      .aggregate([
        { $match: matchConditions },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $lookup: {
            from: "files",
            localField: "resourceId",
            foreignField: "_id",
            as: "resource",
          },
        },
        {
          $addFields: {
            resource: { $arrayElemAt: ["$resource", 0] },
          },
        },
        {
          $project: {
            action: 1,
            resourceType: 1,
            timestamp: 1,
            success: 1,
            "user.name": 1,
            "resource.originalName": 1,
            details: 1,
          },
        },
        { $sort: { timestamp: -1 } },
        { $limit: limit },
      ])
      .toArray()
  }
}
