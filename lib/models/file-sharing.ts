import type { ObjectId } from "mongodb"

export interface FileShare {
  _id?: ObjectId
  fileId: ObjectId
  sharedBy: ObjectId
  sharedWith: ObjectId
  permissions: "read" | "edit" | "download"
  expiresAt?: Date
  createdAt: Date
  isActive: boolean
}

export interface FilePermission {
  _id?: ObjectId
  fileId: ObjectId
  userId: ObjectId
  permission: "owner" | "read" | "edit" | "download" | "approve"
  grantedBy: ObjectId
  grantedAt: Date
  expiresAt?: Date
}
