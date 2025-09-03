import { getDatabase } from "./mongodb"
import type { User } from "./models/user"
import { ObjectId } from "mongodb"

export class UserOperations {
  private static async getDb() {
    return await getDatabase()
  }

  static async createUser(userData: Omit<User, "_id" | "createdAt" | "updatedAt">): Promise<ObjectId> {
    const db = await this.getDb()
    const user: User = {
      ...userData,
      _id: new ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const result = await db.collection("users").insertOne(user)
    return result.insertedId
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    const db = await this.getDb()
    return (await db.collection("users").findOne({ email })) as User | null
  }

  static async getUserById(id: string | ObjectId): Promise<User | null> {
    const db = await this.getDb()
    return (await db.collection("users").findOne({ _id: new ObjectId(id) })) as User | null
  }
}
