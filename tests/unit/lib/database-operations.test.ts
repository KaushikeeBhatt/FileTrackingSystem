import { 
  connectToDatabase,
  disconnectFromDatabase,
  createIndexes,
  performHealthCheck,
  cleanupOldRecords,
  backupCollection,
  validateConnection
} from '@/lib/database-operations';
import { setupTestDatabase, getTestDb, cleanTestDb } from '../../utils/test-helpers';

// Mock MongoDB client
jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(true),
    db: jest.fn().mockReturnValue({
      admin: jest.fn().mockReturnValue({
        ping: jest.fn().mockResolvedValue(true),
      }),
      collection: jest.fn().mockReturnValue({
        createIndex: jest.fn().mockResolvedValue('index_created'),
        deleteMany: jest.fn().mockResolvedValue({ deletedCount: 5 }),
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
        stats: jest.fn().mockResolvedValue({ count: 100, size: 1024 }),
      }),
      listCollections: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          { name: 'files' },
          { name: 'users' },
        ]),
      }),
    }),
  })),
}));

describe('Database Operations', () => {
  setupTestDatabase();

  beforeEach(async () => {
    await cleanTestDb();
  });

  describe('connectToDatabase', () => {
    it('should connect to database successfully', async () => {
      const connection = await connectToDatabase();
      
      expect(connection).toBeDefined();
      expect(connection.client).toBeDefined();
      expect(connection.db).toBeDefined();
    });

    it('should reuse existing connection', async () => {
      const connection1 = await connectToDatabase();
      const connection2 = await connectToDatabase();
      
      expect(connection1).toBe(connection2);
    });

    it('should handle connection errors', async () => {
      const MockMongoClient = require('mongodb').MongoClient;
      MockMongoClient.mockImplementationOnce(() => ({
        connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
      }));

      await expect(connectToDatabase()).rejects.toThrow('Connection failed');
    });
  });

  describe('disconnectFromDatabase', () => {
    it('should disconnect from database', async () => {
      await connectToDatabase();
      const result = await disconnectFromDatabase();
      
      expect(result.success).toBe(true);
    });

    it('should handle disconnect when not connected', async () => {
      const result = await disconnectFromDatabase();
      
      expect(result.success).toBe(true);
    });
  });

  describe('createIndexes', () => {
    it('should create indexes for all collections', async () => {
      const result = await createIndexes();
      
      expect(result.success).toBe(true);
      expect(result.indexesCreated).toBeGreaterThan(0);
    });

    it('should handle index creation errors', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          createIndex: jest.fn().mockRejectedValue(new Error('Index creation failed')),
        }),
      };

      await expect(createIndexes(mockDb as any)).rejects.toThrow('Index creation failed');
    });

    it('should create text search indexes', async () => {
      const mockCollection = {
        createIndex: jest.fn().mockResolvedValue('text_index'),
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection),
      };

      await createIndexes(mockDb as any);

      expect(mockCollection.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'text',
          description: 'text',
        })
      );
    });
  });

  describe('performHealthCheck', () => {
    it('should return healthy status', async () => {
      const health = await performHealthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.database.connected).toBe(true);
      expect(health.timestamp).toBeDefined();
    });

    it('should return unhealthy status on connection failure', async () => {
      const mockDb = {
        admin: jest.fn().mockReturnValue({
          ping: jest.fn().mockRejectedValue(new Error('Ping failed')),
        }),
      };

      const health = await performHealthCheck(mockDb as any);
      
      expect(health.status).toBe('unhealthy');
      expect(health.database.connected).toBe(false);
      expect(health.database.error).toBe('Ping failed');
    });

    it('should include collection statistics', async () => {
      const mockDb = {
        admin: jest.fn().mockReturnValue({
          ping: jest.fn().mockResolvedValue(true),
        }),
        listCollections: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            { name: 'files' },
            { name: 'users' },
          ]),
        }),
        collection: jest.fn().mockReturnValue({
          stats: jest.fn().mockResolvedValue({ count: 50, size: 2048 }),
        }),
      };

      const health = await performHealthCheck(mockDb as any);
      
      expect(health.collections).toBeDefined();
      if (health.collections) {
        expect(health.collections.files).toEqual({ count: 50, size: 2048 });
      }
    });
  });

  describe('cleanupOldRecords', () => {
    it('should clean up old audit logs', async () => {
      const mockCollection = {
        deleteMany: jest.fn().mockResolvedValue({ deletedCount: 10 }),
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection),
      };

      const result = await cleanupOldRecords(mockDb as any, 'auditLogs', 30);
      
      expect(result.deletedCount).toBe(10);
      expect(mockCollection.deleteMany).toHaveBeenCalledWith({
        createdAt: { $lt: expect.any(Date) },
      });
    });

    it('should clean up old notifications', async () => {
      const mockCollection = {
        deleteMany: jest.fn().mockResolvedValue({ deletedCount: 5 }),
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection),
      };

      const result = await cleanupOldRecords(mockDb as any, 'notifications', 7);
      
      expect(result.deletedCount).toBe(5);
    });

    it('should handle cleanup errors', async () => {
      const mockCollection = {
        deleteMany: jest.fn().mockRejectedValue(new Error('Cleanup failed')),
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection),
      };

      await expect(cleanupOldRecords(mockDb as any, 'auditLogs', 30)).rejects.toThrow('Cleanup failed');
    });
  });

  describe('backupCollection', () => {
    it('should backup collection data', async () => {
      const mockData = [
        { _id: '1', name: 'item1' },
        { _id: '2', name: 'item2' },
      ];

      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockData),
        }),
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection),
      };

      const backup = await backupCollection(mockDb as any, 'testCollection');
      
      expect(backup.collectionName).toBe('testCollection');
      expect(backup.data).toEqual(mockData);
      expect(backup.timestamp).toBeDefined();
      expect(backup.recordCount).toBe(2);
    });

    it('should handle empty collections', async () => {
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection),
      };

      const backup = await backupCollection(mockDb as any, 'emptyCollection');
      
      expect(backup.data).toEqual([]);
      expect(backup.recordCount).toBe(0);
    });

    it('should handle backup errors', async () => {
      const mockCollection = {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockRejectedValue(new Error('Backup failed')),
        }),
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection),
      };

      await expect(backupCollection(mockDb as any, 'testCollection')).rejects.toThrow('Backup failed');
    });
  });

  describe('validateConnection', () => {
    it('should validate active connection', async () => {
      const mockClient = {
        topology: { isConnected: () => true },
      };

      const isValid = await validateConnection(mockClient as any);
      
      expect(isValid).toBe(true);
    });

    it('should detect inactive connection', async () => {
      const mockClient = {
        topology: { isConnected: () => false },
      };

      const isValid = await validateConnection(mockClient as any);
      
      expect(isValid).toBe(false);
    });

    it('should handle connection validation errors', async () => {
      const mockClient = {
        topology: { 
          isConnected: () => { throw new Error('Validation error'); }
        },
      };

      const isValid = await validateConnection(mockClient as any);
      
      expect(isValid).toBe(false);
    });
  });
});
