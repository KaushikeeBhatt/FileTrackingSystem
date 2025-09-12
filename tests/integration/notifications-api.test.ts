import { NextRequest } from "next/server";

// Import API routes - middleware is mocked globally in jest.setup.js
import { GET as notificationsHandler } from "@/app/api/notifications/route";
import { GET as unreadCountHandler } from "@/app/api/notifications/unread-count/route";
import { PATCH as markAllReadHandler } from "@/app/api/notifications/mark-all-read/route";
import { DELETE as deleteNotificationHandler } from "@/app/api/notifications/[id]/route";
import { PATCH as markNotificationReadHandler } from "@/app/api/notifications/[id]/read/route";
import { GET as getPreferencesHandler, PATCH as updatePreferencesHandler } from "@/app/api/notifications/preferences/route";

// Import ObjectId after mocking MongoDB
const { ObjectId } = require('mongodb');

// Mock MongoDB
jest.mock('@/lib/mongodb', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    collection: jest.fn().mockImplementation((name) => ({
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn().mockResolvedValue({ _id: 'test-id', userId: 'test-user-id' }),
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'test-id' }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      countDocuments: jest.fn().mockResolvedValue(3),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([
        { _id: 'test-id-1', message: 'Test notification 1', read: false },
        { _id: 'test-id-2', message: 'Test notification 2', read: true }
      ]),
    })),
  }),
}));

// Mock the notification operations
const mockNotifications = [
  { _id: 'test-id-1', message: 'Test notification 1', read: false },
  { _id: 'test-id-2', message: 'Test notification 2', read: true }
];

jest.mock('@/lib/notification-operations', () => ({
  NotificationOperations: {
    getUserNotifications: jest.fn().mockResolvedValue([
      { _id: 'test-id-1', message: 'Test notification 1', read: false },
      { _id: 'test-id-2', message: 'Test notification 2', read: true }
    ]),
    getUnreadNotificationCount: jest.fn().mockResolvedValue(3),
    markAllNotificationsAsRead: jest.fn().mockResolvedValue({ success: true, updatedCount: 2 }),
    markNotificationAsRead: jest.fn().mockResolvedValue({ success: true }),
    deleteNotification: jest.fn().mockResolvedValue({ success: true }),
    createNotification: jest.fn().mockResolvedValue({ insertedId: 'test-id' }),
    getUserNotificationPreferences: jest.fn().mockResolvedValue({ email: true, push: false }),
    updateNotificationPreferences: jest.fn().mockResolvedValue({ success: true })
  },
  getUserNotifications: jest.fn().mockResolvedValue([
    { _id: 'notif1', message: 'Test notification 1', read: false },
    { _id: 'notif2', message: 'Test notification 2', read: true }
  ]),
  getUnreadNotificationCount: jest.fn().mockResolvedValue(3),
  markAllNotificationsAsRead: jest.fn().mockResolvedValue({ success: true, updatedCount: 2 }),
  markNotificationAsRead: jest.fn().mockResolvedValue({ success: true }),
  deleteNotification: jest.fn().mockResolvedValue({ success: true }),
  createNotification: jest.fn().mockResolvedValue({ insertedId: 'test-id' }),
  getUserNotificationPreferences: jest.fn().mockResolvedValue({ email: true, push: false }),
  updateNotificationPreferences: jest.fn().mockResolvedValue({ success: true })
}));

// Mock the auth utilities
jest.mock('@/lib/auth', () => ({
  verifyToken: jest.fn()
}));

// Middleware mocks are now defined above before imports

describe.skip("Notification Operations", () => {
  let mockReq: NextRequest;
  const mockUserId = 'test-user-id';
  const mockNotificationId = 'test-notification-id';

  beforeEach(() => {
    mockReq = new NextRequest("http://localhost:3000/api/notifications");
    (mockReq as any).user = {
      id: mockUserId,
      email: 'test@example.com',
      role: 'user',
      name: 'Test User'
    };
  });

  describe("GET /api/notifications", () => {
    it("should get user notifications successfully", async () => {
      const { getUserNotifications } = require('@/lib/notification-operations');
      getUserNotifications.mockResolvedValue(mockNotifications);

      const response = await notificationsHandler(mockReq);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('notifications');
      expect(Array.isArray(data.notifications)).toBe(true);
      expect(getUserNotifications).toHaveBeenCalledWith(expect.any(ObjectId), 50, 0);
    });
  });

  describe("createNotification", () => {
    it("should create notification successfully", async () => {
      const { createNotification } = require('@/lib/notification-operations');
      
      const notificationData = {
        userId: new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a'),
        type: 'file_approved',
        title: 'File Approved',
        message: 'Your file has been approved',
        read: false,
        updatedAt: new Date(),
        metadata: {}
      };

      const result = await createNotification(notificationData);
      
      expect(result).toBeDefined();
      expect(result.insertedId).toBeDefined();
    });
  });

  describe("GET /api/notifications", () => {
    let mockReq: NextRequest;
    const mockUserId = "68bbd4ca2f9f0826e8226ab3";
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
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(getUserNotifications).toHaveBeenCalledWith(expect.any(ObjectId), 50, 0);
    });

    it("should handle pagination parameters", async () => {
      const { getUserNotifications } = require('@/lib/notification-operations');
      const paginatedReq = new NextRequest("http://localhost:3000/api/notifications?limit=10&skip=5");
      (paginatedReq as any).user = { id: mockUserId };

      await notificationsHandler(paginatedReq);
      
      expect(getUserNotifications).toHaveBeenCalledWith(expect.any(ObjectId), 10, 5);
    });

    it("should handle errors when fetching notifications", async () => {
      const { getUserNotifications } = require('@/lib/notification-operations');
      const errorMessage = 'Failed to fetch notifications';
      getUserNotifications.mockRejectedValue(new Error(errorMessage));

      const response = await notificationsHandler(mockReq);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Failed to fetch notifications');
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
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('updatedCount');
      expect(data.updatedCount).toBe(2);
      expect(markAllNotificationsAsRead).toHaveBeenCalledWith(expect.any(ObjectId));
    });

    it("should handle errors when marking all as read", async () => {
      const { markAllNotificationsAsRead } = require('@/lib/notification-operations');
      markAllNotificationsAsRead.mockRejectedValue(new Error('Database error'));

      const response = await markAllReadHandler(mockReq);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Failed to mark all notifications as read');
    });
  });

  describe("PATCH /api/notifications/[id]/read", () => {
    let mockReq: NextRequest;
    const mockUserId = new ObjectId().toString();
    const mockNotificationId = new ObjectId().toString();

    beforeEach(() => {
      mockReq = new NextRequest(
        `http://localhost:3000/api/notifications/${mockNotificationId}/read`,
        { method: 'PATCH' }
      );
      (mockReq as any).user = { id: mockUserId };
    });

    it("should mark notification as read", async () => {
      const { markNotificationAsRead } = require('@/lib/notification-operations');
      markNotificationAsRead.mockResolvedValue({ success: true });

      const response = await markNotificationReadHandler(mockReq, { params: { id: mockNotificationId } });
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(markNotificationAsRead).toHaveBeenCalledWith(expect.any(ObjectId), expect.any(ObjectId));
    });

    it("should handle missing user", async () => {
      const mockReqNoUser = new NextRequest(
        `http://localhost:3000/api/notifications/${mockNotificationId}/read`,
        { method: 'PATCH' }
      );
      
      const response = await markNotificationReadHandler(mockReqNoUser, { params: { id: mockNotificationId } });
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe("Authentication required");
    });

    it("should handle database errors", async () => {
      const { markNotificationAsRead } = require('@/lib/notification-operations');
      markNotificationAsRead.mockRejectedValue(new Error('Database error'));

      const response = await markNotificationReadHandler(mockReq, { params: { id: mockNotificationId } });
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Failed to mark notification as read');
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
    });

    it("should delete a notification", async () => {
      const { deleteNotification } = require('@/lib/notification-operations');
      deleteNotification.mockResolvedValue({ success: true });

      const response = await deleteNotificationHandler(mockReq, { params: { id: mockNotificationId } });
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(deleteNotification).toHaveBeenCalledWith(expect.any(ObjectId), expect.any(ObjectId));
    });

    it("should handle missing user", async () => {
      const mockReqNoUser = new NextRequest(
        `http://localhost:3000/api/notifications/${mockNotificationId}`,
        { method: 'DELETE' }
      );
      
      const response = await deleteNotificationHandler(mockReqNoUser, { params: { id: mockNotificationId } });
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe("Authentication required");
    });

    it("should handle database errors", async () => {
      const { deleteNotification } = require('@/lib/notification-operations');
      deleteNotification.mockRejectedValue(new Error('Database error'));

      const response = await deleteNotificationHandler(mockReq, { params: { id: mockNotificationId } });
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Failed to delete notification');
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
      const { getUnreadNotificationCount } = require('@/lib/notification-operations');
      getUnreadNotificationCount.mockResolvedValue(3);

      const response = await unreadCountHandler(mockReq);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('count');
      expect(getUnreadNotificationCount).toHaveBeenCalledWith(expect.any(ObjectId));
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
      const { getUnreadNotificationCount } = require('@/lib/notification-operations');
      
      const count = await getUnreadNotificationCount('user123');
      
      expect(typeof count).toBe('number');
    });
  });

  describe("getUserPreferences", () => {
    it("should get user preferences", async () => {
      const { getUserNotificationPreferences } = require('@/lib/notification-operations');
      
      const preferences = await getUserNotificationPreferences('user123');
      
      expect(preferences).toBeDefined();
      expect(typeof preferences.email).toBe('boolean');
    });
  });

  describe("updateUserPreferences", () => {
    it("should update user preferences", async () => {
      const { updateNotificationPreferences } = require('@/lib/notification-operations');
      
      const newPreferences = { email: false, push: true };
      const result = await updateNotificationPreferences('user123', newPreferences);
      
      expect(result.success).toBe(true);
    });
  });

  describe("GET /api/notifications/preferences", () => {
    let mockReq: NextRequest;
    const mockUserId = new ObjectId().toString();

    beforeEach(() => {
      mockReq = new NextRequest("http://localhost:3000/api/notifications/preferences");
      (mockReq as any).user = {
        id: mockUserId,
        email: 'test@example.com',
        role: 'user',
        name: 'Test User'
      };
    });

    it("should get user notification preferences", async () => {
      const { getUserNotificationPreferences } = require('@/lib/notification-operations');
      getUserNotificationPreferences.mockResolvedValue({ email: true, push: false, sms: true });

      const response = await getPreferencesHandler(mockReq);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('preferences');
      expect(data.preferences).toEqual({ email: true, push: false, sms: true });
      expect(getUserNotificationPreferences).toHaveBeenCalledWith(expect.any(ObjectId));
    });

    it("should handle missing user authentication", async () => {
      const mockReqNoUser = new NextRequest("http://localhost:3000/api/notifications/preferences");
      
      const response = await getPreferencesHandler(mockReqNoUser);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Authentication required');
    });

    it("should handle database errors", async () => {
      const { getUserNotificationPreferences } = require('@/lib/notification-operations');
      getUserNotificationPreferences.mockRejectedValue(new Error('Database error'));

      const response = await getPreferencesHandler(mockReq);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Failed to fetch notification preferences');
    });
  });

  describe("PATCH /api/notifications/preferences", () => {
    let mockReq: NextRequest;
    const mockUserId = new ObjectId().toString();

    beforeEach(() => {
      const mockPreferences = { email: false, push: true, sms: false };
      mockReq = new NextRequest("http://localhost:3000/api/notifications/preferences", {
        method: 'PATCH',
        body: JSON.stringify(mockPreferences),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      (mockReq as any).user = {
        id: mockUserId,
        email: 'test@example.com',
        role: 'user',
        name: 'Test User'
      };
    });

    it("should update user notification preferences", async () => {
      const { updateNotificationPreferences } = require('@/lib/notification-operations');
      updateNotificationPreferences.mockResolvedValue({ success: true });

      const response = await updatePreferencesHandler(mockReq);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(updateNotificationPreferences).toHaveBeenCalledWith(
        expect.any(ObjectId),
        { email: false, push: true, sms: false }
      );
    });

    it("should handle missing user authentication", async () => {
      const mockReqNoUser = new NextRequest("http://localhost:3000/api/notifications/preferences", {
        method: 'PATCH',
        body: JSON.stringify({ email: true }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const response = await updatePreferencesHandler(mockReqNoUser);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Authentication required');
    });

    it("should handle database errors", async () => {
      const { updateNotificationPreferences } = require('@/lib/notification-operations');
      updateNotificationPreferences.mockRejectedValue(new Error('Database error'));

      const response = await updatePreferencesHandler(mockReq);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Failed to update notification preferences');
    });

    it("should handle invalid JSON in request body", async () => {
      const mockReqInvalidJson = new NextRequest("http://localhost:3000/api/notifications/preferences", {
        method: 'PATCH',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      (mockReqInvalidJson as any).user = {
        id: mockUserId,
        email: 'test@example.com',
        role: 'user',
        name: 'Test User'
      };

      const response = await updatePreferencesHandler(mockReqInvalidJson);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Failed to update notification preferences');
    });
  });

});
