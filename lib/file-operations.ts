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

  private static isFileTypeAllowed(originalName: string, mimeType: string): boolean {
    const fileExtension = path.extname(originalName).toLowerCase()
    const allowedTypes = envConfig.ALLOWED_FILE_TYPES.split(",").map((t: string) => t.trim().toLowerCase())
    
    if (allowedTypes.length === 0) {
      return true // No restrictions
    }
    
    // Check if MIME type is allowed
    if (allowedTypes.includes(mimeType.toLowerCase())) {
      return true
    }
    
    // Check if file extension is allowed (fallback)
    if (allowedTypes.includes(fileExtension)) {
      return true
    }
    
    return false
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
    
    // Validate file type
    if (!this.isFileTypeAllowed(originalName, mimeType)) {
      const fileExtension = path.extname(originalName).toLowerCase()
      const allowedTypes = envConfig.ALLOWED_FILE_TYPES.split(",").map((t: string) => t.trim())
      throw new Error(`File type '${fileExtension}' (${mimeType}) is not allowed. Allowed types: ${allowedTypes.join(', ')}`)
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
      resourceId: fileId,
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

  private static async createFileVersion(
    fileId: string,
    data: {
      version: number
      filePath: string
      fileSize: number
      uploadedBy: string
      changes?: string
      checksum: string
    },
  ) {
    const db = await this.getDb()
    const doc = {
      fileId: new ObjectId(fileId),
      version: data.version,
      filePath: data.filePath,
      fileSize: data.fileSize,
      uploadedBy: new ObjectId(data.uploadedBy),
      uploadedAt: new Date(),
      changes: data.changes,
      checksum: data.checksum,
    }
    await db.collection("file_versions").insertOne(doc)
    return doc
  }

  static async uploadNewVersion(
    fileId: string,
    newFile: { buffer: Buffer; originalName: string; mimeType: string },
    user: AuthUser,
    changes?: string,
  ) {
    const db = await this.getDb()
    const current = await this.getFileById(fileId)
    if (!current) {
      throw new Error("File not found")
    }

    const maxFileSize = envConfig.MAX_FILE_SIZE
    if (newFile.buffer.length > maxFileSize) {
      throw new Error(`File size exceeds the limit of ${(maxFileSize / (1024 * 1024)).toFixed(2)}MB`)
    }

    // Validate file type
    if (!this.isFileTypeAllowed(newFile.originalName, newFile.mimeType)) {
      const fileExtension = path.extname(newFile.originalName).toLowerCase()
      const allowedTypes = envConfig.ALLOWED_FILE_TYPES.split(",").map((t: string) => t.trim())
      throw new Error(`File type '${fileExtension}' (${newFile.mimeType}) is not allowed. Allowed types: ${allowedTypes.join(', ')}`)
    }

    const fileName = this.generateFileName(newFile.originalName)
    await this.saveFile(newFile.buffer, fileName)

    const checksum = crypto.createHash("md5").update(newFile.buffer).digest("hex")
    const nextVersion = (current.metadata?.version ?? 1) + 1

    await this.createFileVersion(fileId, {
      version: nextVersion,
      filePath: path.join("uploads", fileName),
      fileSize: newFile.buffer.length,
      uploadedBy: user.id,
      changes,
      checksum,
    })

    await db.collection("files").updateOne(
      { _id: new ObjectId(fileId) },
      {
        $set: {
          fileName,
          originalName: newFile.originalName,
          fileType: newFile.mimeType,
          fileSize: newFile.buffer.length,
          filePath: path.join("uploads", fileName),
          updatedAt: new Date(),
          "metadata.checksum": checksum,
          "metadata.version": nextVersion,
        },
      },
    )

    await AuditOperations.createLog({
      userId: new ObjectId(user.id),
      action: "version_upload",
      resourceType: "file",
      resourceId: new ObjectId(fileId),
      details: { version: nextVersion, fileName: newFile.originalName },
      status: "success",
    })

    return { version: nextVersion }
  }

  static async listFileVersions(fileId: string, limit = 50) {
    const db = await this.getDb()
    return await db
      .collection("file_versions")
      .find({ fileId: new ObjectId(fileId) })
      .sort({ version: -1 })
      .limit(limit)
      .toArray()
  }

  static async rollbackToVersion(fileId: string, version: number, user: AuthUser) {
    const db = await this.getDb()
    const target = await db.collection("file_versions").findOne({ fileId: new ObjectId(fileId), version })
    if (!target) {
      throw new Error("Target version not found")
    }

    const current = await this.getFileById(fileId)
    if (!current) {
      throw new Error("File not found")
    }

    const buffer = await this.getFileBuffer(path.basename(target.filePath))
    const newFileName = this.generateFileName(current.originalName)
    await this.saveFile(buffer, newFileName)

    const checksum = crypto.createHash("md5").update(buffer).digest("hex")
    const nextVersion = (current.metadata?.version ?? 1) + 1

    await this.createFileVersion(fileId, {
      version: nextVersion,
      filePath: path.join("uploads", newFileName),
      fileSize: buffer.length,
      uploadedBy: user.id,
      changes: `rollback to ${version}`,
      checksum,
    })

    await db.collection("files").updateOne(
      { _id: new ObjectId(fileId) },
      {
        $set: {
          fileName: newFileName,
          filePath: path.join("uploads", newFileName),
          fileSize: buffer.length,
          updatedAt: new Date(),
          "metadata.checksum": checksum,
          "metadata.version": nextVersion,
        },
      },
    )

    await AuditOperations.createLog({
      userId: new ObjectId(user.id),
      action: "version_rollback",
      resourceType: "file",
      resourceId: new ObjectId(fileId),
      details: { toVersion: version, newVersion: nextVersion },
      status: "success",
    })

    return { version: nextVersion }
  }
}
