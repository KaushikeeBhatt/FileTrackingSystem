import type { ObjectId } from "mongodb"

export type AuditAction = 
  | 'create' | 'update' | 'delete' 
  | 'login' | 'logout' | 'download' | 'upload' | 'share'
  | 'view' | 'edit' | 'approve' | 'reject'

export type ResourceType = 'file' | 'user' | 'folder' | 'permission' | 'system'

export interface AuditLog {
  _id: ObjectId
  timestamp: Date
  userId: ObjectId
  action: AuditAction
  resourceType: ResourceType
  resourceId?: ObjectId
  details: Record<string, unknown>
  status: 'success' | 'failed'
  ipAddress?: string
  userAgent?: string
  error?: string
}
