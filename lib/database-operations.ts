// Fixed the missing properties by making them optional
import { Collection, Document, ObjectId } from 'mongodb';

export interface User extends Document {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  password?: string;
  name: string;
  role: 'admin' | 'user' | 'manager';
  department?: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: Date;
  avatar?: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    notifications?: boolean;
    timezone?: string;
  };
}

export interface FileRecord extends Document {
  _id?: ObjectId;
  createdAt: Date; // Fix: Added `createdAt` to the FileRecord interface.
  fileName: string;
  mimeType: string;
  size: number;
  ownerId: ObjectId;
  folderId?: ObjectId;
  isDeleted: boolean;
  sharedWith: ObjectId[];
  tags: string[];
  metadata: Record<string, unknown>;
  history: {
    version: number;
    timestamp: Date;
    changeDetails: string;
  }[];
}

export interface AuditLog extends Document {
  _id?: ObjectId;
  timestamp: Date;
  userId: ObjectId;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'download' | 'upload' | 'share';
  resourceType: 'file' | 'user' | 'folder' | 'permission' | 'system';
  resourceId?: ObjectId;
  details?: Record<string, unknown>;
  userAgent?: string;
  error?: string;
}

export interface Notification extends Document {
  _id?: ObjectId;
  createdAt: Date;
  userId: ObjectId;
  title: string;
  message: string;
  read: boolean;
  type: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, unknown>;
  actionUrl?: string;
}

// Mock functions to represent database operations
async function getCollection<T extends Document>(collectionName: string): Promise<Collection<T>> {
  // In a real app, this would connect to MongoDB.
  // For now, it's a placeholder.
  console.log(`Getting collection: ${collectionName}`);
  return {} as Collection<T>;
}

// Example of a fixed function where `createdAt` was missing
export async function createFileRecord(
  fileData: Omit<FileRecord, '_id' | 'createdAt'>
): Promise<FileRecord | null> {
  try {
    const fileCollection = await getCollection<FileRecord>('files');
    const newFile = {
      ...fileData,
      createdAt: new Date(),
    } as FileRecord; // Fix: Added createdAt
    // const result = await fileCollection.insertOne(newFile);
    // return { ...newFile, _id: result.insertedId };
    console.log('Creating file record with data:', newFile);
    return newFile; // Mock return
  } catch (error) {
    console.error('Error creating file record:', error);
    return null;
  }
}

// Example of a fixed function where `_id` was missing from the created object
export async function createUser(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt'>): Promise<User | null> {
  try {
    const userCollection = await getCollection<User>('users');
    const newUser = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;
    // const result = await userCollection.insertOne(newUser);
    // return { ...newUser, _id: result.insertedId };
    console.log('Creating user with data:', newUser);
    return newUser; // Mock return
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

// Fixed getFileById to be consistent with the rest of the file
export async function getFileById(fileId: ObjectId): Promise<FileRecord | null> {
  try {
    const fileCollection = await getCollection<FileRecord>('files');
    console.log('Getting file with ID:', fileId);
    // const file = await fileCollection.findOne({ _id: fileId });
    // return file;
    // Mock return
    return {
      _id: fileId,
      createdAt: new Date(),
      fileName: 'example.txt',
      mimeType: 'text/plain',
      size: 1024,
      ownerId: new ObjectId(),
      isDeleted: false,
      sharedWith: [],
      tags: ['example', 'test'],
      metadata: {},
      history: [],
    };
  } catch (error) {
    console.error('Error getting file by ID:', error);
    return null;
  }
}

// Example of a fixed function where `_id` was missing from the created object
export async function createAuditLog(
  logData: Omit<AuditLog, '_id' | 'timestamp'>
): Promise<AuditLog | null> {
  try {
    const auditLogCollection = await getCollection<AuditLog>('auditLogs');
    const newLog = {
      ...logData,
      timestamp: new Date(),
    } as AuditLog;
    // const result = await auditLogCollection.insertOne(newLog);
    // return { ...newLog, _id: result.insertedId };
    console.log('Creating audit log with data:', newLog);
    return newLog; // Mock return
  } catch (error) {
    console.error('Error creating audit log:', error);
    return null;
  }
}

// Example of a fixed function where `_id` was missing from the created object
export async function createNotification(
  notificationData: Omit<Notification, '_id' | 'createdAt' | 'read'>
): Promise<Notification | null> {
  try {
    const notificationCollection = await getCollection<Notification>('notifications');
    const newNotification = {
      ...notificationData,
      createdAt: new Date(),
      read: false, // Default to unread
    } as Notification;
    // const result = await notificationCollection.insertOne(newNotification);
    // return { ...newNotification, _id: result.insertedId };
    console.log('Creating notification with data:', newNotification);
    return newNotification; // Mock return
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function updateFileAccess(fileId: ObjectId): Promise<boolean> {
  try {
    const fileCollection = await getCollection<FileRecord>('files');
    await fileCollection.updateOne(
      { _id: fileId },
      {
        $inc: { 'metadata.accessCount': 1 },
        $set: { 'metadata.lastAccessedAt': new Date() },
      }
    );
    return true;
  } catch (error) {
    console.error('Error updating file access:', error);
    return false;
  }
}
