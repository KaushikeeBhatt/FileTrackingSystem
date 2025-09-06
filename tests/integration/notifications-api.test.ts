import { NextRequest } from "next/server";
import { GET as notificationsHandler } from "@/app/api/notifications/route";
import { GET as unreadCountHandler } from "@/app/api/notifications/unread-count/route";
import { PATCH as markAllReadHandler } from "@/app/api/notifications/mark-all-read/route";
import { DELETE as deleteNotificationHandler } from "@/app/api/notifications/[id]/route";
import { PATCH as markNotificationReadHandler } from "@/app/api/notifications/[id]/read/route";
import { setupTestDatabase, cleanTestDb } from "../utils/test-helpers";
import { ObjectId } from "mongodb";

// Mock the notification operations
jest.mock('@/lib/notification-operations', () => ({
  getUserNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markAllNotificationsAsRead: jest.fn(),
  markNotificationAsRead: jest.fn(),
  deleteNotification: jest.fn(),
  createNotification: jest.fn()
}));

// Mock the auth utilities
jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn()
}));

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
    let mockReq: NextRequest;
    const mockUserId = new ObjectId().toString();
    const mockNotifications = [
      { _id: new ObjectId(), userId: mockUserId, type: 'file_approved', title: 'File Approved', message: 'Your file has been approved', read: false, createdAt: new Date() },
      { _id: new ObjectId(), userId: mockUserId, type: 'file_shared', title: 'File Shared', message: 'A file has been shared with you', read: true, createdAt: new Date() }
    ];

    beforeEach(() => {
      mockReq = new NextRequest("http://localhost:3000/api/notifications");
      (mockReq as any).user = {
        id: mockUserId,
        email: 'test@example.com',
        role: 'user',
        name: 'Test User'
      };
    });

    it("should get user notifications successfully", async () => {
      const { getUserNotifications } = require('@/lib/notification-operations');
      getUserNotifications.mockResolvedValue(mockNotifications);

      const response = await notificationsHandler(mockReq);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.notifications).toHaveLength(2);
      expect(getUserNotifications).toHaveBeenCalledWith(mockUserId, 50, 0);
    });

    it("should handle pagination parameters", async () => {
      const { getUserNotifications } = require('@/lib/notification-operations');
      const paginatedReq = new NextRequest("http://localhost:3000/api/notifications?limit=10&skip=5");
      (paginatedReq as any).user = { id: mockUserId };

      await notificationsHandler(paginatedReq);
      
      expect(getUserNotifications).toHaveBeenCalledWith(mockUserId, 10, 5);
    });

    it("should handle errors when fetching notifications", async () => {
      const { getUserNotifications } = require('@/lib/notification-operations');
      const errorMessage = 'Failed to fetch notifications';
      getUserNotifications.mockRejectedValue(new Error(errorMessage));

      const response = await notificationsHandler(mockReq);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch notifications');
    });
  });

  describe("markNotificationAsRead", () => {
    it("should mark notification as read", async () => {
      const { markNotificationAsRead } = require('@/lib/notification-operations');
      
      const result = await markNotificationAsRead('user123', 'notification123');
      
      expect(result.success).toBe(true);
    });
  });

  describe("PATCH /api/notifications/mark-all-read", () => {
    let mockReq: NextRequest;
    const mockUserId = new ObjectId().toString();
    const mockUpdateResult = { modifiedCount: 2 };

    beforeEach(() => {
      mockReq = new NextRequest("http://localhost:3000/api/notifications/mark-all-read", {
        method: 'PATCH'
      });
      (mockReq as any).user = { id: mockUserId };
    });

    it("should mark all notifications as read", async () => {
      const { markAllNotificationsAsRead } = require('@/lib/notification-operations');
      markAllNotificationsAsRead.mockResolvedValue({ success: true, updatedCount: 2 });

      const response = await markAllReadHandler(mockReq);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.updatedCount).toBe(2);
      expect(markAllNotificationsAsRead).toHaveBeenCalledWith(mockUserId);
    });

    it("should handle errors when marking all as read", async () => {
      const { markAllNotificationsAsRead } = require('@/lib/notification-operations');
      markAllNotificationsAsRead.mockRejectedValue(new Error('Database error'));

      const response = await markAllReadHandler(mockReq);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to mark all notifications as read');
    });
  });

  describe("DELETE /api/notifications/[id]", () => {
    let mockReq: NextRequest;
    const mockUserId = new ObjectId().toString();
    const mockNotificationId = new ObjectId().toString();

    beforeEach(() => {
      // Mock the cookies.get method
      const cookiesGetMock = jest.fn().mockImplementation((name) => {
        if (name === 'token') return { value: 'test-token' };
        return null;
      });

      // Create a new NextRequest with the mocked cookies
      mockReq = {
        ...new NextRequest(
          `http://localhost:3000/api/notifications/${mockNotificationId}`,
          { method: 'DELETE' }
        ),
        cookies: {
          get: cookiesGetMock
        }
      } as unknown as NextRequest;
      
      // Mock verifyToken
      const { verifyToken } = require('@/lib/auth');
      verifyToken.mockResolvedValue({ userId: mockUserId });
    });

    it("should delete a notification successfully", async () => {
      const { deleteNotification } = require('@/lib/notification-operations');
      deleteNotification.mockResolvedValue({ success: true });

      const response = await deleteNotificationHandler(mockReq, { params: { id: mockNotificationId } });
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(deleteNotification).toHaveBeenCalledWith(
        new ObjectId(mockNotificationId),
        new ObjectId(mockUserId)
      );
    });

    it("should return 401 if no token is provided", async () => {
      // Update the cookies.get mock to return null for token
      mockReq.cookies.get = jest.fn().mockReturnValue(null);

      const response = await deleteNotificationHandler(mockReq, { params: { id: mockNotificationId } });
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it("should return 401 for invalid token", async () => {
      const { verifyToken } = require('@/lib/auth');
      verifyToken.mockResolvedValueOnce(null);

      const response = await deleteNotificationHandler(mockReq, { params: { id: mockNotificationId } });
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Invalid token');
    });

    it("should handle errors during deletion", async () => {
      const { deleteNotification } = require('@/lib/notification-operations');
      deleteNotification.mockRejectedValue(new Error('Database error'));

      const response = await deleteNotificationHandler(mockReq, { params: { id: mockNotificationId } });
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Failed to delete notification');
    });
  });

  describe("PATCH /api/notifications/[id]/read", () => {
    let mockReq: NextRequest;
    const mockUserId = new ObjectId().toString();
    const mockNotificationId = new ObjectId().toString();

    beforeEach(() => {
      // Mock the cookies.get method
      const cookiesGetMock = jest.fn().mockImplementation((name) => {
        if (name === 'token') return { value: 'test-token' };
        return null;
      });

      // Create a new NextRequest with the mocked cookies
      mockReq = {
        ...new NextRequest(
          `http://localhost:3000/api/notifications/${mockNotificationId}/read`,
          { method: 'PATCH' }
        ),
        cookies: {
          get: cookiesGetMock
        }
      } as unknown as NextRequest;
      
      // Mock verifyToken
      const { verifyToken } = require('@/lib/auth');
      verifyToken.mockResolvedValue({ userId: mockUserId });
    });

    it("should mark a notification as read successfully", async () => {
      const { markNotificationAsRead } = require('@/lib/notification-operations');
      markNotificationAsRead.mockResolvedValue({ success: true });

      const response = await markNotificationReadHandler(mockReq, { params: { id: mockNotificationId } });
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(markNotificationAsRead).toHaveBeenCalledWith(
        new ObjectId(mockNotificationId),
        new ObjectId(mockUserId)
      );
    });

    it("should handle errors when marking as read", async () => {
      const { markNotificationAsRead } = require('@/lib/notification-operations');
      markNotificationAsRead.mockRejectedValue(new Error('Database error'));

      const response = await markNotificationReadHandler(mockReq, { params: { id: mockNotificationId } });
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Failed to mark notification as read');
    });
  });

  describe("DELETE /api/notifications/[id]", () => {
    let mockReq: NextRequest;
    const mockUserId = new ObjectId().toString();
    const mockNotificationId = new ObjectId().toString();

    beforeEach(() => {
      mockReq = new NextRequest(
        `http://localhost:3000/api/notifications/${mockNotificationId}`,
        { method: 'DELETE' }
      );
      (mockReq as any).user = { id: mockUserId };
      (mockReq as any).params = { id: mockNotificationId };
    });

    it("should delete a notification", async () => {
      const { deleteNotification } = require('@/lib/notification-operations');
      deleteNotification.mockResolvedValue({ success: true });

      const response = await deleteNotificationHandler(mockReq, { params: { id: mockNotificationId } });
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(deleteNotification).toHaveBeenCalledWith(mockNotificationId, mockUserId);
    });
  });

  describe("GET /api/notifications/unread-count", () => {
    let mockReq: NextRequest;
    const mockUserId = new ObjectId().toString();

    beforeEach(() => {
      mockReq = new NextRequest("http://localhost:3000/api/notifications/unread-count");
      (mockReq as any).user = { id: mockUserId };
    });

    it("should get unread notification count", async () => {
      const { getUnreadCount } = require('@/lib/notification-operations');
      getUnreadCount.mockResolvedValue(3);

      const response = await unreadCountHandler(mockReq);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.count).toBe(3);
      expect(getUnreadCount).toHaveBeenCalledWith(mockUserId);
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
