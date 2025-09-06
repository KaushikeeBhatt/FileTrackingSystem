import { getDatabase } from "./mongodb"
import { ObjectId } from "mongodb"
import { AuditOperations } from "./audit-operations"
import { validateEnvironment } from "./env-validation"
import type { FileRecord } from '@/lib/models/file'

import type { AuthUser } from "@/lib/auth"
import * as crypto from "crypto"
import fs from "fs/promises"
import path from "path"

// Initialize environment variables
const env = validateEnvironment();
if (!env.isValid || !env.config) {
  throw new Error(`Environment validation failed: ${env.errors?.join(', ')}`);
}
const { config: envConfig } = env;

export class FileOperations {
  private static uploadDir = path.join(process.cwd(), "uploads")

  private static async getDb() {
    return await getDatabase()
  }

  private static async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir)
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true })
    }
  }

  private static generateFileName(originalName: string): string {
    const ext = path.extname(originalName)
    const name = path.basename(originalName, ext)
    const timestamp = Date.now()
    const random = crypto.randomBytes(8).toString("hex")
    return `${name}_${timestamp}_${random}${ext}`
  }

  private static async saveFile(buffer: Buffer, fileName: string): Promise<void> {
    await this.ensureUploadDir()
    const filePath = path.join(this.uploadDir, fileName)
    await fs.writeFile(filePath, buffer)
  }

  static async uploadFile(
    file: { buffer: Buffer; originalName: string; mimeType: string },
    user: AuthUser,
    metadata: { description?: string; tags?: string[]; department?: string; category?: string },
  ): Promise<FileRecord & { id: string }> {
    const { buffer, originalName, mimeType } = file

    const maxFileSize = envConfig.MAX_FILE_SIZE;
    if (buffer.length > maxFileSize) {
      throw new Error(`File size exceeds the limit of ${(maxFileSize / (1024 * 1024)).toFixed(2)}MB`)
    }
    
    const allowedTypes = envConfig.ALLOWED_FILE_TYPES.split(",").map((t: string) => t.trim());
      
    if (allowedTypes.length > 0 && !allowedTypes.includes(mimeType)) {
      throw new Error(`File type '${mimeType}' is not allowed.`)
    }

    const fileName = this.generateFileName(originalName)
    const now = new Date()

    const fileRecord: FileRecord = {
      _id: new ObjectId(),
      fileName,
      originalName,
      fileType: mimeType,
      fileSize: buffer.length,
      filePath: path.join("uploads", fileName),
      uploadedBy: new ObjectId(user.id),
      status: "pending_approval",
      department: metadata.department || user.department || "unassigned",
      category: metadata.category || "general",
      tags: metadata.tags || [],
      description: metadata.description,
      createdAt: now,
      updatedAt: now,
      metadata: {
        version: 1,
        checksum: crypto.createHash("md5").update(buffer).digest("hex"),
        accessCount: 0,
      },
    }

    await this.saveFile(buffer, fileName)

    const fileId = await this.createFileRecord(fileRecord)

    await AuditOperations.createLog({
      userId: new ObjectId(user.id),
      action: "upload",
      resourceType: "file",
      resourceId: new ObjectId(fileId),
      details: { fileName: originalName, size: buffer.length },
      status: "success"
    })

    return { ...fileRecord, _id: fileId, id: fileId.toString() }
  }

  static async createFileRecord(fileData: Omit<FileRecord, "_id">): Promise<ObjectId> {
    const db = await this.getDb()
    const result = await db.collection("files").insertOne(fileData)
    return result.insertedId
  }

  static async approveFile(fileId: string, approverId: string): Promise<boolean> {
    const db = await this.getDb()
    const result = await db.collection("files").updateOne(
      { _id: new ObjectId(fileId), status: "pending_approval" },
      { $set: { status: "active", updatedAt: new Date() } },
    )

    if (result.modifiedCount === 1) {
      await AuditOperations.createLog({
        userId: new ObjectId(approverId),
        action: "update",
        resourceType: "file",
        resourceId: new ObjectId(fileId),
        details: { status: "approved" },
        status: "success"
      })
      return true
    }

    return false
  }

  static async deleteFile(fileId: string, userId: string): Promise<boolean> {
    const db = await this.getDb()
    const file = await this.getFileById(fileId)

    if (!file) {
      return false
    }

    // Optional: Check permissions here if needed

    try {
      const filePath = path.join(this.uploadDir, file.fileName)
      await fs.unlink(filePath)

      // Only delete from DB if physical file deletion is successful
      const result = await db.collection("files").deleteOne({ _id: new ObjectId(fileId) })

      if (result.deletedCount === 1) {
        await AuditOperations.createLog({
          userId: new ObjectId(userId),
          action: "delete",
          resourceType: "file",
          resourceId: new ObjectId(fileId),
          details: { fileName: file.originalName },
          status: "success"
        })
        return true
      }
      return false
    } catch (error) {
      console.error(`Failed to delete file: ${file.fileName}`, error)
      // If file deletion fails, do not delete the database record
      return false
    }
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

  static async getFileById(fileId: string): Promise<FileRecord | null> {
    const db = await this.getDb()
    return (await db.collection("files").findOne({ _id: new ObjectId(fileId) })) as FileRecord | null
  }

  static async getFileBuffer(fileName: string): Promise<Buffer> {
    const filePath = path.join(this.uploadDir, fileName)
    return await fs.readFile(filePath)
  }
}
