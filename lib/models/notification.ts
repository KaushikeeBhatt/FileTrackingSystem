import type { ObjectId } from "mongodb"

export type NotificationType = 
  | 'info' 
  | 'warning' 
  | 'error' 
  | 'success'
  | 'file_approval_pending' 
  | 'file_approved' 
  | 'file_rejected' 
  | 'file_shared' 
  | 'system_alert'

export interface Notification {
  _id: ObjectId
  userId: ObjectId
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, unknown>
  actionUrl?: string
  expiresAt?: Date
}
