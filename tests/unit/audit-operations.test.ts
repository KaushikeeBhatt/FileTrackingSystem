// Mock MongoDB first
jest.mock('@/lib/mongodb', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    collection: jest.fn().mockImplementation((name) => ({
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'test-id' }),
      aggregate: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      }),
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
    }))
  })
}));

// Mock ObjectId
jest.mock('mongodb', () => ({
  ObjectId: jest.fn().mockImplementation((id) => ({
    toString: () => id || 'test-id'
  }))
}));

const { ObjectId } = require('mongodb');

// Import AuditOperations directly
const AuditOperations = require('../../lib/audit-operations').AuditOperations;

describe('AuditOperations', () => {
  const mockUserId = new ObjectId('507f1f77bcf86cd799439011');
  const mockResourceId = new ObjectId('507f1f77bcf86cd799439012');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLog', () => {
    it('should create audit log successfully', async () => {
      const logData = {
        userId: mockUserId,
        action: 'upload' as const,
        resourceType: 'file' as const,
        resourceId: mockResourceId,
        details: { fileName: 'test.pdf' },
        status: 'success' as const
      };

      const result = await AuditOperations.createLog(logData);
      
      expect(result).toBeDefined();
    });
  });

  describe('getAuditTrail', () => {
    it('should get audit trail for admin user', async () => {
      const mockCollection = {
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            { _id: 'log1', action: 'upload', user: { name: 'Test User' } }
          ])
        })
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const filters = { action: 'upload' };
      const user = { id: 'admin-id', role: 'admin' };
      
      const result = await AuditOperations.getAuditTrail(filters, user, 50, 0);
      
      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('total');
      expect(mockDb.collection).toHaveBeenCalledWith('audit_logs');
    });

    it('should filter audit trail for regular user', async () => {
      const mockCollection = {
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const filters = {};
      const user = { id: 'user-id', role: 'user' };
      
      await AuditOperations.getAuditTrail(filters, user);
      
      expect(mockDb.collection).toHaveBeenCalledWith('audit_logs');
    });

    it('should apply date filters', async () => {
      const mockCollection = {
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const filters = {
        dateFrom: new Date('2023-01-01'),
        dateTo: new Date('2023-12-31'),
        resourceType: 'file',
        status: 'success'
      };
      const user = { id: 'admin-id', role: 'admin' };
      
      await AuditOperations.getAuditTrail(filters, user);
      
      expect(mockDb.collection).toHaveBeenCalledWith('audit_logs');
    });
  });

  describe('getAuditStats', () => {
    it('should get audit stats for admin', async () => {
      const mockCollection = {
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            {
              totalActions: 100,
              successfulActions: 90,
              failedActions: 10,
              uniqueUsers: 5
            }
          ])
        })
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const filters = {};
      const result = await AuditOperations.getAuditStats(filters, 'admin');
      
      expect(result).toHaveProperty('totalActions');
      expect(result).toHaveProperty('successfulActions');
      expect(result).toHaveProperty('failedActions');
      expect(result).toHaveProperty('uniqueUsers');
      expect(result).toHaveProperty('actionBreakdown');
      expect(result).toHaveProperty('dailyActivity');
      expect(result).toHaveProperty('topUsers');
    });

    it('should get audit stats for regular user', async () => {
      const mockCollection = {
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const filters = {};
      await AuditOperations.getAuditStats(filters, 'user', 'user-id');
      
      expect(mockDb.collection).toHaveBeenCalledWith('audit_logs');
    });

    it('should apply date filters in stats', async () => {
      const mockCollection = {
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const filters = {
        dateFrom: new Date('2023-01-01'),
        dateTo: new Date('2023-12-31')
      };
      
      await AuditOperations.getAuditStats(filters, 'admin');
      
      expect(mockDb.collection).toHaveBeenCalledWith('audit_logs');
    });
  });

  describe('exportAuditReport', () => {
    it('should export audit report in JSON format', async () => {
      const mockLogs = [
        {
          timestamp: new Date('2023-01-01'),
          user: { name: 'Test User' },
          action: 'upload',
          resourceType: 'file',
          status: 'success'
        }
      ];

      // Mock getAuditTrail
      jest.spyOn(AuditOperations, 'getAuditTrail').mockResolvedValue({
        logs: mockLogs,
        total: 1
      });

      const filters = {};
      const user = { id: 'admin-id', role: 'admin' };
      
      const result = await AuditOperations.exportAuditReport(filters, user, 'json');
      
      expect(typeof result).toBe('string');
      expect(result).toContain('upload');
    });

    it('should export audit report in CSV format', async () => {
      const mockLogs = [
        {
          timestamp: new Date('2023-01-01'),
          user: { name: 'Test User' },
          action: 'upload',
          resourceType: 'file',
          status: 'success',
          details: { fileName: 'test.pdf' },
          resource: { originalName: 'test.pdf' }
        }
      ];

      jest.spyOn(AuditOperations, 'getAuditTrail').mockResolvedValue({
        logs: mockLogs,
        total: 1
      });

      const filters = {};
      const user = { id: 'admin-id', role: 'admin' };
      
      const result = await AuditOperations.exportAuditReport(filters, user, 'csv');
      
      expect(typeof result).toBe('string');
      expect(result).toContain('Timestamp');
      expect(result).toContain('upload');
    });
  });

  describe('createDetailedAuditLog', () => {
    it('should create detailed audit log with request info', async () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '10.0.0.1'
        }
      };

      const result = await AuditOperations.createDetailedAuditLog(
        mockUserId,
        'upload',
        'file',
        mockResourceId,
        { fileName: 'test.pdf' },
        true,
        mockRequest
      );
      
      expect(result).toBeDefined();
    });

    it('should create detailed audit log with error', async () => {
      const result = await AuditOperations.createDetailedAuditLog(
        mockUserId,
        'upload',
        'file',
        mockResourceId,
        { fileName: 'test.pdf' },
        false,
        undefined,
        'Upload failed'
      );
      
      expect(result).toBeDefined();
    });

    it('should handle missing request info', async () => {
      const result = await AuditOperations.createDetailedAuditLog(
        mockUserId,
        'download',
        'file',
        mockResourceId,
        { fileName: 'test.pdf' },
        true
      );
      
      expect(result).toBeDefined();
    });
  });

  describe('getRecentActivity', () => {
    it('should get recent activity for admin', async () => {
      const mockCollection = {
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            {
              action: 'upload',
              resourceType: 'file',
              timestamp: new Date(),
              status: 'success',
              user: { name: 'Test User' }
            }
          ])
        })
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const result = await AuditOperations.getRecentActivity('admin-id', 'admin', 10);
      
      expect(Array.isArray(result)).toBe(true);
      expect(mockDb.collection).toHaveBeenCalledWith('audit_logs');
    });

    it('should get recent activity for regular user', async () => {
      const mockCollection = {
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      };
      const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      await AuditOperations.getRecentActivity('user-id', 'user');
      
      expect(mockDb.collection).toHaveBeenCalledWith('audit_logs');
    });
  });
});
