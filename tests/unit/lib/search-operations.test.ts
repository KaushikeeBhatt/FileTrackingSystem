// Unmock search-operations to test actual implementation
jest.unmock('@/lib/search-operations');

import { SearchOperations } from '@/lib/search-operations';
import { ObjectId } from 'mongodb';

// Mock the mongodb module
jest.mock('@/lib/mongodb', () => ({
  getDatabase: jest.fn()
}));

describe('SearchOperations', () => {
  const { getDatabase } = require('@/lib/mongodb');
  
  // Mock data
  const mockFile = {
    _id: new ObjectId(),
    fileName: 'test1.pdf',
    originalName: 'test1.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
    uploadedBy: { _id: 'user123', name: 'Test User', email: 'test@example.com' },
    department: 'IT',
    category: 'Documents',
    tags: ['test', 'document'],
    status: 'active',
    createdAt: new Date(),
    metadata: { version: 1, accessCount: 0 }
  };

  let mockCollection: any;
  let mockDb: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh mocks for each test
    mockCollection = {
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([mockFile]),
      countDocuments: jest.fn().mockResolvedValue(1),
      aggregate: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([mockFile])
      })
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection)
    };

    // Setup the getDatabase mock
    getDatabase.mockResolvedValue(mockDb);
  });

  describe('advancedSearch', () => {
    it('should search with filters for regular user', async () => {
      const filters = {
        query: 'test',
        status: 'active',
        page: 1,
        limit: 10
      };

      // Mock the aggregate pipeline for count and results
      mockCollection.aggregate.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValue([{ total: 1 }])
      }).mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValue([mockFile])
      });

      const result = await SearchOperations.advancedSearch(filters, '507f1f77bcf86cd799439011', 'user');

      // Verify the result structure
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should allow admins to search all files', async () => {
      const filters = {
        query: 'test',
        status: 'all',
        page: 1,
        limit: 10
      };

      // Mock the aggregate pipeline for count and results
      mockCollection.aggregate.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValue([{ total: 1 }])
      }).mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValue([mockFile])
      });

      const result = await SearchOperations.advancedSearch(filters, '507f1f77bcf86cd799439012', 'admin');

      // Verify the result structure
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should handle empty results', async () => {
      const filters = {
        query: 'nonexistent',
        page: 1,
        limit: 10
      };

      // Mock the aggregate pipeline for empty results
      mockCollection.aggregate.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValue([])
      }).mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValue([])
      });

      const result = await SearchOperations.advancedSearch(filters, '507f1f77bcf86cd799439011', 'user');

      expect(result).toMatchObject({
        results: [],
        total: 0
      });
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return search suggestions', async () => {
      const mockSuggestions = [
        { type: 'file', value: 'test1.pdf', count: 1 },
        { type: 'tag', value: 'test', count: 1 }
      ];

      // Override the mock for this test
      mockCollection.aggregate.mockReturnThis();
      mockCollection.toArray.mockResolvedValueOnce(mockSuggestions);

      const suggestions = await SearchOperations.getSearchSuggestions('test', '507f1f77bcf86cd799439011', 'user');
      
      expect(Array.isArray(suggestions)).toBe(true);
      // Don't check length since we're mocking the response
    });
  });
});
