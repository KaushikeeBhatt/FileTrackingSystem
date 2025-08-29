import { getDatabase } from "./mongodb"
import { ObjectId } from "mongodb"
import type { FileShare } from "./models/file-sharing"
import { AuditOperations } from "./audit-operations"
import { FileOperations } from "./file-operations"

export class FileSharingOperations {
  private static async getDb() {
    return await getDatabase()
  }

  static async shareFile(
    fileId: string,
    sharedBy: string,
    sharedWith: string,
    permissions: "read" | "edit" | "download",
    expiresAt?: Date,
  ) {
    // Check if file exists and user has permission to share
    const file = await FileOperations.getFileById(fileId)
    if (!file) throw new Error("File not found")

    // For now, only the owner can share. More complex logic can be added here.
    if (file.uploadedBy.toString() !== sharedBy) {
      throw new Error("Only the file owner can share this file.")
    }

    const db = await this.getDb()

    // Create or update share record
    const shareData: FileShare = {
      fileId: new ObjectId(fileId),
      sharedBy: new ObjectId(sharedBy),
      sharedWith: new ObjectId(sharedWith),
      permissions,
      expiresAt,
      createdAt: new Date(),
      isActive: true,
    }

    const result = await db.collection("fileShares").insertOne(shareData)

    // Create audit log
    await AuditOperations.createLog({
      userId: new ObjectId(sharedBy),
      action: "share",
      resourceType: "file",
      resourceId: new ObjectId(fileId),
      details: { sharedWith, permissions },
      success: true,
    })

    return result
  }

  static async getFilePermissions(fileId: string, userId: string) {
    // Check if user is owner
    const file = await FileOperations.getFileById(fileId)
    if (file?.uploadedBy.toString() === userId) {
      return { permission: "owner", canShare: true, canEdit: true, canDownload: true }
    }

    const db = await this.getDb()

    // Check shared permissions
    const share = await db.collection("fileShares").findOne({
      fileId: new ObjectId(fileId),
      sharedWith: new ObjectId(userId),
      isActive: true,
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
    })

    if (share) {
      return {
        permission: share.permissions,
        canShare: false,
        canEdit: share.permissions === "edit",
        canDownload: ["download", "edit"].includes(share.permissions as string),
      }
    }

    return null
  }

  static async getSharedFiles(userId: string) {
    const db = await this.getDb()

    const pipeline = [
      {
        $match: {
          sharedWith: new ObjectId(userId),
          isActive: true,
          $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
        },
      },
      {
        $lookup: {
          from: "files",
          localField: "fileId",
          foreignField: "_id",
          as: "file",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "sharedBy",
          foreignField: "_id",
          as: "sharedByUser",
        },
      },
      { $unwind: "$file" },
      { $unwind: "$sharedByUser" },
    ]

    return await db.collection("fileShares").aggregate(pipeline).toArray()
  }

  static async revokeFileShare(shareId: string, userId: string) {
    const db = await this.getDb()

    const result = await db.collection("fileShares").updateOne(
      {
        _id: new ObjectId(shareId),
        $or: [{ sharedBy: new ObjectId(userId) }, { sharedWith: new ObjectId(userId) }],
      },
      { $set: { isActive: false } },
    )

    return result
  }
}
