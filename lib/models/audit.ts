import type { ObjectId } from "mongodb"

export interface AuditLog {
  _id?: ObjectId
  userId: ObjectId
  action: "upload" | "download" | "view" | "edit" | "delete" | "approve" | "reject" | "share"
  resourceType: "file" | "user" | "system"
  resourceId: ObjectId
  details: {
    fileName?: string
    size?: number
    status?: string
    previousValue?: any
    newValue?: any
    ipAddress?: string
    userAgent?: string
  }
  timestamp: Date
  success: boolean
  errorMessage?: string
}
