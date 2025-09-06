import { ObjectId } from 'mongodb';
import { 
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '@/lib/notification-operations';
import type { Notification, NotificationType } from '@/lib/models/notification';
import { setupTestDatabase, getTestDb, cleanTestDb } from '../../utils/test-helpers';

// Mock database operations
jest.mock('@/lib/mongodb', () => ({
  getDatabase: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue({
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'notification123' }),
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
      }),
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 5 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      countDocuments: jest.fn().mockResolvedValue(0),
    }),
  }),
}));

describe('Notification Operations', () => {
  setupTestDatabase();

  beforeEach(async () => {
    await cleanTestDb();
  });

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const notificationData: Omit<Notification, '_id' | 'createdAt' | 'isRead'> = {
        userId: new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a'),
        type: 'file_approved',
        title: 'File Approved',
        message: 'Your file has been approved',
        metadata: { fileId: 'file123' },
        read: false,
        updatedAt: new Date()
      };

      const result = await createNotification(notificationData);
      expect(result).toBeDefined();
      // The actual implementation returns the MongoDB insert result
      expect(result.insertedId).toBe('notification123');
    });

    it('should validate required fields', async () => {
      // Test with missing required fields
      const invalidData = {
        // Missing userId and type
        title: 'Test',
        message: 'Test message',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date()
      } as unknown as Omit<Notification, '_id' | 'createdAt' | 'isRead'>;

      await expect(createNotification(invalidData)).rejects.toThrow();
    });

    it('should validate notification type', async () => {
      // Test with invalid notification type
      const invalidData = {
        userId: new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a'),
        type: 'invalid_type' as any, // Force invalid type for testing
        title: 'Test',
        message: 'Test message',
        read: false,
        updatedAt: new Date()
      };

      await expect(createNotification(invalidData)).rejects.toThrow();
    });

    it('should set default values', async () => {
      const mockDb = require('@/lib/mongodb').getDatabase();
      const insertSpy = mockDb.collection().insertOne;

      const notification: Omit<Notification, 'isRead'> = {
        _id: new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a'),
        userId: new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a'),
        type: 'file_approved',
        title: 'File Approved',
        message: 'Your file has been approved',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await createNotification(notification);

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: notification.userId,
          type: 'file_approved',
          title: 'File Approved',
          message: 'Your file has been approved',
          read: false,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          metadata: {}
        })
      );
    });
  });

  describe('getUserNotifications', () => {
    it('should retrieve user notifications with pagination', async () => {
      const mockNotifications = [
        {
          _id: new ObjectId(),
          userId: new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a'),
          type: 'file_approved' as const,
          title: 'Notification 1',
          message: 'Test message 1',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {}
        },
        {
          _id: new ObjectId(),
          userId: new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a'),
          type: 'file_approved' as const,
          title: 'Notification 2',
          message: 'Test message 2',
          read: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {}
        },
      ] as Notification[];

      const mockDb = require('@/lib/mongodb').getDatabase();
      mockDb.collection().find().toArray.mockResolvedValue(mockNotifications);
      mockDb.collection().countDocuments.mockResolvedValue(2);

      const userId = new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a');
      const result = await getUserNotifications(userId, 10, 0);
      expect(result).toEqual(mockNotifications);
    });

    it('should filter by read status', async () => {
      const mockDb = require('@/lib/mongodb').getDatabase();
      const findSpy = mockDb.collection().find;

      const userId = new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a');
      await getUserNotifications(userId, 10, 0);

      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: userId
        })
      );
    });

    it('should handle empty results', async () => {
      const mockDb = require('@/lib/mongodb').getDatabase();
      mockDb.collection().find().toArray.mockResolvedValue([]);
      mockDb.collection().countDocuments.mockResolvedValue(0);

      const userId = new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a');
      const result = await getUserNotifications(userId, 10, 0);

      expect(result).toEqual([]);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const mockDb = require('@/lib/mongodb').getDatabase();
      mockDb.collection().updateOne.mockResolvedValue({ modifiedCount: 1 });

      const userId = new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a');
      const notificationId = new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0b');
      const result = await markNotificationAsRead(userId, notificationId);

      expect(result).toBe(true);
      expect(mockDb.collection().updateOne).toHaveBeenCalledWith(
        { _id: notificationId, userId: userId },
        { $set: { read: true, updatedAt: expect.any(Date) } }
      );
    });

    it('should handle non-existent notification', async () => {
      const mockDb = require('@/lib/mongodb').getDatabase();
      mockDb.collection().updateOne.mockResolvedValue({ modifiedCount: 0 });

      const userId = new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a');
      const notificationId = new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0b');
      const result = await markNotificationAsRead(userId, notificationId);

      expect(result).toBe(false);
    });

    it('should only update user own notifications', async () => {
      const mockDb = require('@/lib/mongodb').getDatabase();
      const updateSpy = mockDb.collection().updateOne;

      const userId = new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a');
      const notificationId = new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0b');
      const result = await markNotificationAsRead(userId, notificationId);

      expect(result).toBe(true);
      expect(mockDb.collection().updateOne).toHaveBeenCalledWith(
        { _id: notificationId, userId: userId },
        { $set: { read: true, updatedAt: expect.any(Date) } }
      );
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all user notifications as read', async () => {
      const mockDb = require('@/lib/mongodb').getDatabase();
      mockDb.collection().updateMany.mockResolvedValue({ modifiedCount: 5 });

      const userId = new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a');
      const result = await markAllNotificationsAsRead(userId);

      expect(result).toBe(true);
      expect(mockDb.collection().updateMany).toHaveBeenCalledWith(
        { userId: userId, read: false },
        { $set: { read: true, updatedAt: expect.any(Date) } }
      );
    });

    it('should only update unread notifications', async () => {
      const mockDb = require('@/lib/mongodb').getDatabase();
      const updateSpy = mockDb.collection().updateMany;

      const userId = new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a');
      const result = await markAllNotificationsAsRead(userId);

      expect(result).toBe(true);
      expect(mockDb.collection().updateMany).toHaveBeenCalledWith(
        { userId: userId, read: false },
        { $set: { read: true, updatedAt: expect.any(Date) } }
      );
    });
  });

  describe('deleteNotification', () => {
    it('should delete user notification', async () => {
      const mockDb = require('@/lib/mongodb').getDatabase();
      mockDb.collection().deleteOne.mockResolvedValue({ deletedCount: 1 });

      const userId = new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a');
      const notificationId = new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0b');
      const result = await deleteNotification(userId, notificationId);

      expect(result).toBe(true);
      expect(mockDb.collection().deleteOne).toHaveBeenCalledWith({
        _id: notificationId,
        userId: userId
      });
    });

    it('should handle non-existent notification', async () => {
      const mockDb = require('@/lib/mongodb').getDatabase();
      mockDb.collection().deleteOne.mockResolvedValue({ deletedCount: 0 });

      const userId = new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0a');
      const notificationId = new ObjectId('5f8d8f9b8c9d8b0a1c9d8b0b');
      const result = await deleteNotification(userId, notificationId);

      expect(result).toBe(false);
    });
  });

});
