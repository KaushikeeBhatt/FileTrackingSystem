import { FileOperations } from '@/lib/file-operations';
import { setupTestDatabase, cleanTestDb, stopTestDatabase, createTestUser } from '../../utils/test-helpers';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';

// Mocks
jest.mock('fs/promises');
jest.mock('@/lib/audit-operations');
jest.mock('@/lib/mongodb');

// Mock env-validation to provide proper config
jest.mock('@/lib/env-validation', () => ({
  validateEnvironment: jest.fn().mockReturnValue({
    isValid: true,
    config: {
      MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
      UPLOAD_DIR: '/tmp/uploads',
      ALLOWED_FILE_TYPES: 'text/plain,image/jpeg,image/png,application/pdf',
      JWT_SECRET: 'test-secret'
    },
    errors: []
  })
}));

// Mock MongoDB collection
const mockCollection = {
  insertOne: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  find: jest.fn().mockReturnThis(),
  toArray: jest.fn()
};

// Mock MongoDB database
const mockDb = {
  collection: jest.fn().mockReturnValue(mockCollection)
};

// Mock MongoDB getDatabase
jest.mock('@/lib/mongodb', () => ({
  getDatabase: jest.fn().mockImplementation(() => Promise.resolve({
    collection: jest.fn().mockReturnValue(mockCollection)
  }))
}));

describe('FileOperations', () => {
  let user: any;

  beforeAll(async () => {
    // Setup test user
    user = {
      _id: new ObjectId(),
      id: new ObjectId().toHexString(),
      email: 'test@example.com',
      name: 'Test User',
      role: 'user'
    };

    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockCollection.findOne.mockImplementation((query) => {
      if (query._id) {
        return Promise.resolve({
          _id: query._id,
          originalName: 'test.txt',
          mimeType: 'text/plain',
          size: 100,
          path: '/tmp/uploads/test-file.txt',
          userId: user._id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      return Promise.resolve(null);
    });

    mockCollection.insertOne.mockResolvedValue({
      insertedId: new ObjectId(),
      acknowledged: true
    });

    mockCollection.updateOne.mockResolvedValue({
      matchedCount: 1,
      modifiedCount: 1,
      upsertedId: null,
      acknowledged: true
    });

    mockCollection.deleteOne.mockResolvedValue({
      deletedCount: 1,
      acknowledged: true
    });

    // Mock file system operations
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload a file and create a record', async () => {
      const testFile = {
        buffer: Buffer.from('test content'),
        originalName: 'test.txt',
        mimeType: 'text/plain',
      };

      const mockFileId = new ObjectId();
      mockCollection.insertOne.mockResolvedValueOnce({
        insertedId: mockFileId,
        acknowledged: true
      });

      const result = await FileOperations.uploadFile(testFile, user, {});

      expect(result).toBeDefined();
      expect(result.originalName).toBe('test.txt');
      expect(fs.writeFile).toHaveBeenCalled();
      expect(mockCollection.insertOne).toHaveBeenCalledWith(expect.objectContaining({
        originalName: 'test.txt',
        fileType: 'text/plain',
        uploadedBy: expect.any(ObjectId)
      }));
    });

    it('should reject files larger than MAX_FILE_SIZE', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const largeFile = {
        buffer: largeBuffer,
        originalName: 'large_file.txt',
        mimeType: 'text/plain',
      };

      await expect(FileOperations.uploadFile(largeFile, user, {})).rejects.toThrow('File size exceeds');
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });

    it('should reject disallowed file types', async () => {
      const jsFile = {
        buffer: Buffer.from('malicious code'),
        originalName: 'malicious.js',
        mimeType: 'application/javascript',
      };

      await expect(FileOperations.uploadFile(jsFile, user, {})).rejects.toThrow(/File type .* is not allowed/);
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });
  });

  describe('getFileById', () => {
    it('should retrieve a file by its ID', async () => {
      const fileId = new ObjectId();
      const mockFile = {
        _id: fileId,
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 100,
        path: '/tmp/uploads/test-file.txt',
        userId: user._id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockCollection.findOne.mockResolvedValueOnce(mockFile);

      const result = await FileOperations.getFileById(fileId.toHexString());

      expect(result).toBeDefined();
      expect(result?._id.toString()).toBe(fileId.toHexString());
      expect(result?.originalName).toBe('test.txt');
    });

    it('should return null for non-existent file', async () => {
      const nonExistentId = new ObjectId().toHexString();
      mockCollection.findOne.mockResolvedValueOnce(null);

      const result = await FileOperations.getFileById(nonExistentId);
      expect(result).toBeNull();
    });
  });

  describe('deleteFile', () => {
    it('should delete a file and its record', async () => {
      const fileId = new ObjectId();
      const mockFile = {
        _id: fileId,
        originalName: 'delete_me.txt',
        fileName: 'delete_me.txt',
        fileType: 'text/plain',
        fileSize: 100,
        filePath: 'uploads/delete_me.txt',
        uploadedBy: user._id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockCollection.findOne.mockResolvedValueOnce(mockFile);
      mockCollection.deleteOne.mockResolvedValueOnce({ deletedCount: 1, acknowledged: true });
      (fs.unlink as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await FileOperations.deleteFile(fileId.toHexString(), user._id.toHexString());

      expect(result).toBe(true);
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('delete_me.txt'));
      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ _id: fileId });
    });

    it('should return false if file not found', async () => {
      const nonExistentId = new ObjectId().toHexString();
      mockCollection.findOne.mockResolvedValueOnce(null);

      const result = await FileOperations.deleteFile(nonExistentId, user._id.toHexString());
      expect(result).toBe(false);
      expect(fs.unlink).not.toHaveBeenCalled();
      expect(mockCollection.deleteOne).not.toHaveBeenCalled();
    });

    it('should return false if user is not the owner', async () => {
      const fileId = new ObjectId();
      const otherUserId = new ObjectId();
      const mockFile = {
        _id: fileId,
        originalName: 'not_owned.txt',
        mimeType: 'text/plain',
        size: 100,
        path: '/tmp/uploads/not_owned.txt',
        uploadedBy: otherUserId, // Different user ID
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockCollection.findOne.mockResolvedValueOnce(mockFile);

      const result = await FileOperations.deleteFile(fileId.toHexString(), user._id.toHexString());
      expect(result).toBe(false);
      expect(fs.unlink).not.toHaveBeenCalled();
      expect(mockCollection.deleteOne).not.toHaveBeenCalled();
    });
  });

  describe('getFileById', () => {
    it('should retrieve a file by its ID', async () => {
      const fileId = new ObjectId();
      const mockFile = {
        _id: fileId,
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 100,
        path: '/tmp/uploads/test-file.txt',
        userId: user._id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockCollection.findOne.mockResolvedValueOnce(mockFile);

      const result = await FileOperations.getFileById(fileId.toHexString());

      expect(result).toBeDefined();
      expect(result?._id.toString()).toBe(fileId.toHexString());
      expect(result?.originalName).toBe('test.txt');
    });

    it('should return null for non-existent file', async () => {
      const nonExistentId = new ObjectId().toHexString();
      mockCollection.findOne.mockResolvedValueOnce(null);

      const result = await FileOperations.getFileById(nonExistentId);
      expect(result).toBeNull();
    });
  });
});
