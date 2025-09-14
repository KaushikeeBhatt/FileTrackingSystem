/** @type {import('jest').Config} */
const nextJest = require('next/jest');
const dotenv = require('dotenv');

// Load environment variables from .env.test
dotenv.config({ path: '.env.test' });

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  testMatch: [
    '**/tests/unit/**/*.test.[jt]s?(x)',
    '**/tests/integration/**/*.test.[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    //'/tests/e2e/',
    '/app/api/notifications/',
    '/tests/integration/notifications-api.test.ts',
    '/tests/integration/files-api.test.ts',
    '/tests/unit/file-sharing-operations.test.ts',
    '/tests/unit/lib/database-operations.test.ts',
    '/tests/integration/auth-api.test.ts',
    '/tests/integration/health-api.test.ts',
    '/tests/unit/auth-fetch.test.ts',
    '/tests/integration/audit-api.test.ts',
    '/tests/integration/admin-api.test.ts',
    '/tests/integration/search-api.test.ts',
    '/tests/unit/audit-operations.test.ts',
    '/tests/unit/lib/file-operations.test.ts',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
    }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!@mongodb-js/|bson|mongodb|mongodb-memory-server.*|mongodb-memory-server-core.*|mongodb-memory-server-core/node_modules/bson.*)/',
  ],
  setupFiles: ['<rootDir>/.jest/setEnvVars.js'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node', 'mjs'],
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts', '.cts'],
  collectCoverage: process.env.CI !== 'true',
  collectCoverageFrom: [
    'app/api/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/*.d.ts',
    '!**/types/**',
    '!**/middleware/**',
    '!tests/**',
    '!app/api/notifications/**',
    '!app/api/files/*/delete/**',
  ],
  clearMocks: true,
  coverageThreshold: {
    global: {
      statements: 5,
      branches: 2,
      functions: 5,
      lines: 5,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
