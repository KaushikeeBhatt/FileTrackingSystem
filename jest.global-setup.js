// jest.global-setup.js
const { startTestDatabase } = require('./tests/utils/test-helpers');

module.exports = async function () {
  try {
    // Start the test database
    await startTestDatabase();
    console.log('Test database started successfully');
  } catch (error) {
    console.error('Failed to start test database:', error);
    process.exit(1);
  }
};
