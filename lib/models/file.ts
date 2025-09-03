import type { ObjectId } from "mongodb"

export interface FileRecord {
  _id: ObjectId
  fileName: string
  originalName: string
  fileType: string
  fileSize: number
  filePath: string
  uploadedBy: ObjectId
  department: string
  category: string
  tags: string[]
  description?: string
  status: "active" | "archived" | "pending_approval" | "rejected"
  approvedBy?: ObjectId
  approvedAt?: Date
  createdAt: Date
  updatedAt: Date
  metadata: {
    version: number
    checksum: string
    lastAccessedAt?: Date
    accessCount: number
  }
}

export interface FileVersion {
  _id: ObjectId
  fileId: ObjectId
  version: number
  filePath: string
  fileSize: number
  uploadedBy: ObjectId
  uploadedAt: Date
  changes?: string
  checksum: string
}
