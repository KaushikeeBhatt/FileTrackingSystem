import type { ObjectId } from "mongodb"

export interface Notification {
  _id?: ObjectId
  userId: ObjectId
  type: "file_approval_pending" | "file_approved" | "file_rejected" | "file_shared" | "system_alert"
  title: string
  message: string
  fileId?: ObjectId
  isRead: boolean
  createdAt: Date
  expiresAt?: Date
}
