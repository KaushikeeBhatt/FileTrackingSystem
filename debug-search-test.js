// Simple test to debug search API issue
const { NextRequest } = require('next/server');

// Mock the middleware and search operations
jest.mock('@/lib/middleware/rate-limit', () => ({
  withAuthAndRateLimit: jest.fn().mockImplementation((handler) => {
    return async (req, ...args) => {
      req.user = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
        name: 'Test User',
        department: 'test'
      };
      try {
        const result = await handler(req, ...args);
        console.log('Handler result:', result);
        return result;
      } catch (error) {
        console.error('Handler error:', error);
        throw error;
      }
    };
  }),
}));

jest.mock('@/lib/search-operations', () => ({
  SearchOperations: {
    advancedSearch: jest.fn().mockResolvedValue({
      results: [],
      total: 0
    })
  }
}));

async function testSearchAPI() {
  try {
    // Import after mocking
    const { POST: advancedSearchHandler } = require('./app/api/search/advanced/route');
    
    const req = new NextRequest("http://localhost:3000/api/search/advanced", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(null), // Invalid filters
    });

    console.log('Calling handler...');
    const response = await advancedSearchHandler(req);
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    console.log('Has success property:', data.hasOwnProperty('success'));
    console.log('Success value:', data.success);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testSearchAPI();
