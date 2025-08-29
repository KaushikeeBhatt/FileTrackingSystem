import { getDatabase } from "./mongodb"
import type { ObjectId } from "mongodb"
import type { Notification } from "./models/notification"

export interface NotificationPreferences {
  userId: ObjectId
  emailNotifications: boolean
  pushNotifications: boolean
  fileApprovalNotifications: boolean
  fileUploadNotifications: boolean
  systemAlertNotifications: boolean
  digestFrequency: "immediate" | "daily" | "weekly" | "never"
}

export class NotificationOperations {
  private static async getDb() {
    return await getDatabase()
  }

  static async createNotification(notification: Omit<Notification, "_id" | "createdAt" | "isRead">) {
    const db = await this.getDb()

    const newNotification: Notification = {
      ...notification,
      isRead: false,
      createdAt: new Date(),
    }

    const result = await db.collection("notifications").insertOne(newNotification)

    // Send real-time notification if user is online
    await this.sendRealTimeNotification(notification.userId, newNotification)

    // Send email notification if enabled
    await this.sendEmailNotification(notification.userId, newNotification)

    return result
  }

  static async getUserNotifications(userId: ObjectId, limit = 50, skip = 0) {
    const db = await this.getDb()

    return await db
      .collection("notifications")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray()
  }

  static async markNotificationAsRead(notificationId: ObjectId, userId: ObjectId) {
    const db = await this.getDb()

    return await db
      .collection("notifications")
      .updateOne({ _id: notificationId, userId }, { $set: { isRead: true } })
  }

  static async markAllNotificationsAsRead(userId: ObjectId) {
    const db = await this.getDb()

    return await db.collection("notifications").updateMany({ userId, isRead: false }, { $set: { isRead: true } })
  }

  static async getUnreadNotificationCount(userId: ObjectId) {
    const db = await this.getDb()

    return await db.collection("notifications").countDocuments({
      userId,
      isRead: false,
    })
  }

  static async deleteNotification(notificationId: ObjectId, userId: ObjectId) {
    const db = await this.getDb()

    return await db.collection("notifications").deleteOne({
      _id: notificationId,
      userId,
    })
  }

  static async getUserNotificationPreferences(userId: ObjectId): Promise<NotificationPreferences | null> {
    const db = await this.getDb()

    return (await db.collection("notification_preferences").findOne({ userId })) as NotificationPreferences | null
  }

  static async updateNotificationPreferences(userId: ObjectId, preferences: Partial<NotificationPreferences>) {
    const db = await this.getDb()

    return await db
      .collection("notification_preferences")
      .updateOne({ userId }, { $set: { ...preferences, userId } }, { upsert: true })
  }

  private static async sendRealTimeNotification(userId: ObjectId, notification: Notification) {
    // In a real app, this would use WebSockets or Server-Sent Events
    // For now, we'll just log it
    console.log(`[Real-time] Notification sent to user ${userId}:`, notification.title)
  }

  private static async sendEmailNotification(userId: ObjectId, notification: Notification) {
    const db = await this.getDb()

    // Get user preferences
    const preferences = await this.getUserNotificationPreferences(userId)
    if (!preferences?.emailNotifications) return

    // Get user email
    const user = await db.collection("users").findOne({ _id: userId })
    if (!user?.email) return

    // In a real app, this would integrate with an email service like SendGrid, Resend, etc.
    console.log(`[Email] Notification sent to ${user.email}:`, notification.title)

    // Store email log
    await db.collection("email_logs").insertOne({
      userId,
      email: user.email,
      subject: notification.title,
      content: notification.message,
      sentAt: new Date(),
      status: "sent",
    })
  }

  static async cleanupExpiredNotifications() {
    const db = await this.getDb()

    return await db.collection("notifications").deleteMany({
      expiresAt: { $lt: new Date() },
    })
  }
}

export const createNotification = NotificationOperations.createNotification.bind(NotificationOperations)
export const getUserNotifications = NotificationOperations.getUserNotifications.bind(NotificationOperations)
export const markNotificationAsRead = NotificationOperations.markNotificationAsRead.bind(NotificationOperations)
export const markAllNotificationsAsRead = NotificationOperations.markAllNotificationsAsRead.bind(NotificationOperations)
export const getUnreadNotificationCount = NotificationOperations.getUnreadNotificationCount.bind(NotificationOperations)
export const deleteNotification = NotificationOperations.deleteNotification.bind(NotificationOperations)
export const getUserNotificationPreferences = NotificationOperations.getUserNotificationPreferences.bind(NotificationOperations)
export const updateNotificationPreferences = NotificationOperations.updateNotificationPreferences.bind(NotificationOperations)
export const cleanupExpiredNotifications = NotificationOperations.cleanupExpiredNotifications.bind(NotificationOperations)
