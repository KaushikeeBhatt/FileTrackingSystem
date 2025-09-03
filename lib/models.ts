import { ObjectId } from 'mongodb'

export interface User {
  _id: ObjectId
  email: string
  password: string
  name: string
  role: 'admin' | 'user' | 'manager'
  department?: string
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
  status: 'active' | 'inactive' | 'suspended'
  avatar?: string
  preferences?: {
    theme?: 'light' | 'dark' | 'system'
    notifications?: {
      email?: boolean
      push?: boolean
    }
  }
}

export interface FileRecord {
  _id: ObjectId
  fileName: string
  originalName: string
  fileType: string
  size: number
  uploadedBy: ObjectId
  uploadedAt: Date
  status: 'active' | 'archived' | 'deleted'
  metadata: {
    description?: string
    tags?: string[]
    accessCount: number
    lastAccessedAt?: Date
    version: number
  }
  parentFolder?: ObjectId
  sharedWith: Array<{
    userId: ObjectId
    permission: 'view' | 'edit' | 'admin'
    sharedAt: Date
    sharedBy: ObjectId
  }>
}

export interface AuditLog {
  _id: ObjectId
  userId: ObjectId
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'download' | 'upload' | 'share'
  resourceType: 'file' | 'user' | 'folder' | 'permission' | 'system'
  resourceId?: ObjectId
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  details?: Record<string, unknown>
  status: 'success' | 'failure'
  error?: string
}

export interface Notification {
  _id: ObjectId
  userId: ObjectId
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  read: boolean
  createdAt: Date
  actionUrl?: string
  metadata?: Record<string, unknown>
}

export interface FileShare {
  _id: ObjectId
  fileId: ObjectId
  sharedWith: ObjectId
  permission: 'view' | 'edit' | 'admin'
  sharedBy: ObjectId
  sharedAt: Date
  expiresAt?: Date
  status: 'active' | 'revoked' | 'expired'
  token?: string
}

export interface Folder {
  _id: ObjectId
  name: string
  parentFolder?: ObjectId
  createdBy: ObjectId
  createdAt: Date
  updatedAt: Date
  status: 'active' | 'archived' | 'deleted'
  metadata?: {
    description?: string
    tags?: string[]
  }
  permissions: Array<{
    userId: ObjectId
    permission: 'view' | 'edit' | 'admin'
    grantedAt: Date
    grantedBy: ObjectId
  }>
}

// Re-export commonly used types
export type { ObjectId } from 'mongodb'
