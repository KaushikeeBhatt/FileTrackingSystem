import { FileOperations } from '@/lib/file-operations';
import { setupTestDatabase, cleanTestDb, stopTestDatabase, createTestUser } from '../../utils/test-helpers';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';

// Mocks
jest.mock('fs/promises');
jest.mock('@/lib/audit-operations');

describe('FileOperations', () => {
  let user: any;

  setupTestDatabase();

  beforeAll(async () => {
    user = await createTestUser();
  });

  beforeEach(async () => {
    await cleanTestDb();
    (fs.writeFile as jest.Mock).mockClear();
    (fs.unlink as jest.Mock).mockClear();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  describe('uploadFile', () => {
    it('should upload a file and create a record', async () => {
      const file = {
        buffer: Buffer.from('test content'),
        originalName: 'test.txt',
        mimeType: 'text/plain',
      };
      const metadata = { description: 'A test file' };

      const result = await FileOperations.uploadFile(file, user, metadata);

      expect(result.id).toBeDefined();
      expect(result.originalName).toBe('test.txt');
      expect(result.status).toBe('pending_approval');
      expect(fs.writeFile).toHaveBeenCalled();

      const db = await getDatabase();
      const record = await db.collection('files').findOne({ _id: new ObjectId(result.id) });
      expect(record).toBeDefined();
      expect(record?.originalName).toBe('test.txt');
    });

    it('should reject oversized files', async () => {
      process.env.MAX_FILE_SIZE = '10'; // 10 bytes
      const file = {
        buffer: Buffer.from('this content is too long'),
        originalName: 'large.txt',
        mimeType: 'text/plain',
      };

      await expect(FileOperations.uploadFile(file, user, {})).rejects.toThrow(/File size exceeds the limit/);
      delete process.env.MAX_FILE_SIZE;
    });

    it('should reject disallowed file types', async () => {
      process.env.ALLOWED_FILE_TYPES = 'text/plain,image/jpeg';
      const file = {
        buffer: Buffer.from('content'),
        originalName: 'script.js',
        mimeType: 'application/javascript',
      };

      await expect(FileOperations.uploadFile(file, user, {})).rejects.toThrow(/File type .* is not allowed/);
      delete process.env.ALLOWED_FILE_TYPES;
    });
  });

  describe('deleteFile', () => {
    it('should delete a file and its record', async () => {
      const file = {
        buffer: Buffer.from('to be deleted'),
        originalName: 'delete_me.txt',
        mimeType: 'text/plain',
      };
      const uploaded = await FileOperations.uploadFile(file, user, {});

      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const result = await FileOperations.deleteFile(uploaded.id, user.id);

      expect(result).toBe(true);
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('delete_me.txt'));

      const db = await getDatabase();
      const record = await db.collection('files').findOne({ _id: new ObjectId(uploaded.id) });
      expect(record).toBeNull();
    });
  });

  describe('getFileById', () => {
    it('should retrieve a file by its ID', async () => {
      const file = {
        buffer: Buffer.from('some data'),
        originalName: 'retrievable.txt',
        mimeType: 'text/plain',
      };
      const uploaded = await FileOperations.uploadFile(file, user, {});

      const found = await FileOperations.getFileById(uploaded.id);

      expect(found).toBeDefined();
      expect(found?._id.toString()).toBe(uploaded.id);
      expect(found?.originalName).toBe('retrievable.txt');
    });
  });
});
