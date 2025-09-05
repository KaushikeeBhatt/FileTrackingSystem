// jest.global-teardown.js
const { stopTestDatabase } = require('./tests/utils/test-helpers');

module.exports = async function () {
  try {
    // Stop the test database
    await stopTestDatabase();
    console.log('Test database stopped successfully');
  } catch (error) {
    console.error('Error during test database teardown:', error);
    process.exit(1);
  }
};
