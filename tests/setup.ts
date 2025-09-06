import { setupTestDatabase, stopTestDatabase } from './utils/test-helpers';

// Set test timeout to 30 seconds
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test-file-tracking';
  
  // Setup test database
  try {
    await setupTestDatabase();
  } catch (error) {
    console.error('Failed to set up test database:', error);
    process.exit(1);
  }
});

// Global test teardown
afterAll(async () => {
  try {
    await stopTestDatabase();
  } catch (error) {
    console.error('Error during test teardown:', error);
  }
});

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
