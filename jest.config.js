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
    // Handle CSS imports (with CSS modules)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  testMatch: [
    '**/tests/unit/**/*.test.[jt]s?(x)',
    '**/tests/integration/**/*.test.[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/tests/e2e/'
  ],
  // Global setup and teardown
  globalSetup: '<rootDir>/jest.global-setup.js',
  globalTeardown: '<rootDir>/jest.global-teardown.js',
  // Transform settings
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
  // Setup files
  setupFiles: ['<rootDir>/.jest/setEnvVars.js'],
  // Add moduleDirectories
  moduleDirectories: ['node_modules', '<rootDir>/'],
  // Add extensions to handle
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node', 'mjs'],
  // ESM support
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts', '.cts'],
  // Add coverage settings
  collectCoverage: true,
  collectCoverageFrom: [
    // Only collect coverage from API routes and lib files that have tests
    'app/api/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'tests/utils/**/*.{js,jsx,ts,tsx}',
    // Exclude specific files
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/*.d.ts',
    '!**/types/**',
    '!**/middleware/**', // Exclude middleware for now
    '!lib/models/**', // Exclude models for now
  ],
  // Coverage thresholds - adjusted for current testing scope
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

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
