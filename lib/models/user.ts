import type { ObjectId } from "mongodb"

export interface User {
  _id?: ObjectId
  email: string
  password: string
  name: string
  role: "admin" | "manager" | "user"
  department?: string
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

export interface UserSession {
  _id?: ObjectId
  userId: ObjectId
  token: string
  expiresAt: Date
  createdAt: Date
}
