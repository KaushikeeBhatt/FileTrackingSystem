import { FileSharingOperations } from '@/lib/file-sharing-operations';
import { FileOperations } from '@/lib/file-operations';
import { AuditOperations } from '@/lib/audit-operations';
import { ObjectId } from 'mongodb';

// Mock dependencies
jest.mock('@/lib/mongodb', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    collection: jest.fn().mockImplementation((name) => ({
      insertOne: jest.fn().mockResolvedValue({ insertedId: MockObjectId() }),
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      aggregate: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      })
    }))
  })
}));

jest.mock('@/lib/file-operations', () => ({
  FileOperations: {
    getFileById: jest.fn()
  }
}));

jest.mock('@/lib/audit-operations', () => ({
  AuditOperations: {
    createLog: jest.fn().mockResolvedValue('test-audit-id')
  }
}));

// Mock ObjectId before importing the module
const MockObjectId = jest.fn().mockImplementation((id) => {
  if (id && typeof id === 'string' && id.length === 24) {
    return {
      toString: () => id,
      toHexString: () => id
    };
  }
  return {
    toString: () => '507f1f77bcf86cd799439011',
    toHexString: () => '507f1f77bcf86cd799439011'
  };
});

jest.mock('mongodb', () => ({
  ObjectId: MockObjectId
}));

describe('FileSharingOperations', () => {
  const mockFileId = '507f1f77bcf86cd799439011';
  const mockUserId = '507f1f77bcf86cd799439012';
  const mockOtherUserId = '507f1f77bcf86cd799439013';
  const mockShareId = '507f1f77bcf86cd799439014';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('shareFile', () => {
    it('should share file successfully when user is owner', async () => {
      const mockFile = {
        _id: MockObjectId(mockFileId),
        uploadedBy: MockObjectId(mockUserId),
        originalName: 'test.pdf'
      };

      (FileOperations.getFileById as jest.Mock).mockResolvedValue(mockFile);

      const mockDb = {
        collection: jest.fn().mockReturnValue({
          insertOne: jest.fn().mockResolvedValue({ insertedId: MockObjectId() })
        })
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const result = await FileSharingOperations.shareFile(
        mockFileId,
        mockUserId,
        mockOtherUserId,
        'read'
      );

      expect(FileOperations.getFileById).toHaveBeenCalledWith(mockFileId);
      expect(mockDb.collection).toHaveBeenCalledWith('fileShares');
      expect(AuditOperations.createLog).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should share file with expiration date', async () => {
      const mockFile = {
        _id: MockObjectId(mockFileId),
        uploadedBy: MockObjectId(mockUserId),
        originalName: 'test.pdf'
      };

      (FileOperations.getFileById as jest.Mock).mockResolvedValue(mockFile);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const result = await FileSharingOperations.shareFile(
        mockFileId,
        mockUserId,
        mockOtherUserId,
        'edit',
        expiresAt
      );

      expect(result).toBeDefined();
    });

    it('should throw error when file not found', async () => {
      (FileOperations.getFileById as jest.Mock).mockResolvedValue(null);

      await expect(
        FileSharingOperations.shareFile(
          mockFileId,
          mockUserId,
          mockOtherUserId,
          'read'
        )
      ).rejects.toThrow('File not found');
    });

    it('should throw error when user is not owner', async () => {
      const mockFile = {
        _id: MockObjectId(mockFileId),
        uploadedBy: MockObjectId('different-user'),
        originalName: 'test.pdf'
      };

      (FileOperations.getFileById as jest.Mock).mockResolvedValue(mockFile);

      await expect(
        FileSharingOperations.shareFile(
          mockFileId,
          mockUserId,
          mockOtherUserId,
          'read'
        )
      ).rejects.toThrow('Only the file owner can share this file.');
    });
  });

  describe('getFilePermissions', () => {
    it('should return owner permissions when user is owner', async () => {
      const mockFile = {
        _id: MockObjectId(mockFileId),
        uploadedBy: MockObjectId(mockUserId),
        originalName: 'test.pdf'
      };

      (FileOperations.getFileById as jest.Mock).mockResolvedValue(mockFile);

      const result = await FileSharingOperations.getFilePermissions(mockFileId, mockUserId);

      expect(result).toEqual({
        permission: 'owner',
        canShare: true,
        canEdit: true,
        canDownload: true
      });
    });

    it('should return shared permissions when file is shared with user', async () => {
      const mockFile = {
        _id: MockObjectId(mockFileId),
        uploadedBy: MockObjectId('different-user'),
        originalName: 'test.pdf'
      };

      (FileOperations.getFileById as jest.Mock).mockResolvedValue(mockFile);

      const mockShare = {
        permissions: 'edit',
        isActive: true
      };

      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(mockShare)
        })
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const result = await FileSharingOperations.getFilePermissions(mockFileId, mockUserId);

      expect(result).toEqual({
        permission: 'edit',
        canShare: false,
        canEdit: true,
        canDownload: true
      });
    });

    it('should return read permissions for read-only share', async () => {
      const mockFile = {
        _id: MockObjectId(mockFileId),
        uploadedBy: MockObjectId('different-user'),
        originalName: 'test.pdf'
      };

      (FileOperations.getFileById as jest.Mock).mockResolvedValue(mockFile);

      const mockShare = {
        permissions: 'read',
        isActive: true
      };

      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(mockShare)
        })
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const result = await FileSharingOperations.getFilePermissions(mockFileId, mockUserId);

      expect(result).toEqual({
        permission: 'read',
        canShare: false,
        canEdit: false,
        canDownload: false
      });
    });

    it('should return download permissions for download share', async () => {
      const mockFile = {
        _id: MockObjectId(mockFileId),
        uploadedBy: MockObjectId('different-user'),
        originalName: 'test.pdf'
      };

      (FileOperations.getFileById as jest.Mock).mockResolvedValue(mockFile);

      const mockShare = {
        permissions: 'download',
        isActive: true
      };

      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(mockShare)
        })
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const result = await FileSharingOperations.getFilePermissions(mockFileId, mockUserId);

      expect(result).toEqual({
        permission: 'download',
        canShare: false,
        canEdit: false,
        canDownload: true
      });
    });

    it('should return null when no permissions found', async () => {
      const mockFile = {
        _id: MockObjectId(mockFileId),
        uploadedBy: MockObjectId('different-user'),
        originalName: 'test.pdf'
      };

      (FileOperations.getFileById as jest.Mock).mockResolvedValue(mockFile);

      const mockDb = {
        collection: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(null)
        })
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const result = await FileSharingOperations.getFilePermissions(mockFileId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('getSharedFiles', () => {
    it('should return shared files for user', async () => {
      const mockSharedFile = {
        _id: MockObjectId(mockShareId),
        fileId: MockObjectId(mockFileId),
        sharedBy: MockObjectId(mockUserId),
        sharedWith: MockObjectId(mockOtherUserId),
        permission: 'read',
        createdAt: new Date()
      };

      const mockDb = {
        collection: jest.fn().mockReturnValue({
          aggregate: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([mockSharedFile])
          })
        })
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const result = await FileSharingOperations.getSharedFiles(mockUserId);

      expect(Array.isArray(result)).toBe(true);
      expect(mockDb.collection).toHaveBeenCalledWith('fileShares');
    });

    it('should return empty array when no shared files', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          aggregate: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([])
          })
        })
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const result = await FileSharingOperations.getSharedFiles(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('revokeFileShare', () => {
    it('should revoke file share when user is sharer', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
        })
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const result = await FileSharingOperations.revokeFileShare(mockShareId, mockUserId);

      expect(result).toEqual({ modifiedCount: 1 });
      expect(mockDb.collection).toHaveBeenCalledWith('fileShares');
    });

    it('should revoke file share when user is recipient', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
        })
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const result = await FileSharingOperations.revokeFileShare(mockShareId, mockOtherUserId);

      expect(result).toEqual({ modifiedCount: 1 });
    });

    it('should handle case when share not found', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          updateOne: jest.fn().mockResolvedValue({ modifiedCount: 0 })
        })
      };
      
      const { getDatabase } = require('@/lib/mongodb');
      getDatabase.mockResolvedValue(mockDb);

      const result = await FileSharingOperations.revokeFileShare(mockShareId, mockUserId);

      expect(result).toEqual({ modifiedCount: 0 });
    });
  });
});
