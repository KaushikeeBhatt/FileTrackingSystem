// jest.global-setup.js
const { setupTestDatabase } = require('./tests/utils/test-helpers');

module.exports = async function () {
  try {
    // Start the test database
    await setupTestDatabase();
    console.log('Test database started successfully');
  } catch (error) {
    console.error('Failed to start test database:', error);
    process.exit(1);
  }
};
