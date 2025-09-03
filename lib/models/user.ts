import type { ObjectId } from "mongodb"

export interface User {
  _id: ObjectId
  email: string
  password: string
  name: string
  role: 'admin' | 'user' | 'manager'
  department?: string
  status: 'active' | 'inactive' | 'suspended'
  lastLogin?: Date
  avatar?: string
  preferences?: {
    theme?: 'light' | 'dark' | 'system'
    notifications?: boolean
    emailNotifications?: boolean
  }
  createdAt: Date
  updatedAt: Date
}

export interface UserSession {
  _id: ObjectId
  userId: ObjectId
  token: string
  expiresAt: Date
  createdAt: Date
  userAgent?: string
  ipAddress?: string
}
