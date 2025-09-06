import { NextRequest } from "next/server";
import { GET as notificationsHandler } from "@/app/api/notifications/route";
import { GET as unreadCountHandler } from "@/app/api/notifications/unread-count/route";
import { PATCH as markAllReadHandler } from "@/app/api/notifications/mark-all-read/route";
import { setupTestDatabase, getTestDb, cleanTestDb } from "../utils/test-helpers";

// These mocks are now handled in jest.setup.js

describe("Notification Operations", () => {
  setupTestDatabase();

  beforeEach(async () => {
    await cleanTestDb();
  });

  describe("getUserNotifications", () => {
    it("should retrieve user notifications", async () => {
      const { getUserNotifications } = require('@/lib/notification-operations');
      
      const result = await getUserNotifications('user123');
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("createNotification", () => {
    it("should create notification successfully", async () => {
      const { createNotification } = require('@/lib/notification-operations');
      
      const notificationData = {
        recipientId: 'user123',
        type: 'file_approved',
        title: 'File Approved',
        message: 'Your file has been approved',
      };

      const result = await createNotification(notificationData);
      
      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();
    });
  });

  describe("GET /api/notifications", () => {
    it("should get user notifications", async () => {
      const req = new NextRequest("http://localhost:3000/api/notifications");
      
      (req as any).user = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
        name: 'Test User'
      };

      const response = await notificationsHandler(req);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.notifications).toBeDefined();
      expect(Array.isArray(data.notifications)).toBe(true);
    });
  });

  describe("markNotificationAsRead", () => {
    it("should mark notification as read", async () => {
      const { markNotificationAsRead } = require('@/lib/notification-operations');
      
      const result = await markNotificationAsRead('user123', 'notification123');
      
      expect(result.success).toBe(true);
    });
  });

  describe("markAllNotificationsAsRead", () => {
    it("should mark all notifications as read", async () => {
      const { markAllNotificationsAsRead } = require('@/lib/notification-operations');
      
      const result = await markAllNotificationsAsRead('user123');
      
      expect(result.success).toBe(true);
      expect(typeof result.updatedCount).toBe('number');
    });
  });

  describe("deleteNotification", () => {
    it("should delete notification", async () => {
      const { deleteNotification } = require('@/lib/notification-operations');
      
      const result = await deleteNotification('user123', 'notification123');
      
      expect(result.success).toBe(true);
    });
  });

  describe("getUnreadCount", () => {
    it("should get unread notification count", async () => {
      const { getUnreadCount } = require('@/lib/notification-operations');
      
      const count = await getUnreadCount('user123');
      
      expect(typeof count).toBe('number');
    });
  });

  describe("getUserPreferences", () => {
    it("should get user preferences", async () => {
      const { getUserPreferences } = require('@/lib/notification-operations');
      
      const preferences = await getUserPreferences('user123');
      
      expect(preferences).toBeDefined();
      expect(typeof preferences.email).toBe('boolean');
    });
  });

  describe("updateUserPreferences", () => {
    it("should update user preferences", async () => {
      const { updateUserPreferences } = require('@/lib/notification-operations');
      
      const newPreferences = { email: false, push: true };
      const result = await updateUserPreferences('user123', newPreferences);
      
      expect(result.success).toBe(true);
    });
  });
});
