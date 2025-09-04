const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './', // Path to your Next.js app
});

const customJestConfig = {
  // Use the 'jsdom' environment for tests that rely on browser globals like 'window'
  testEnvironment: 'jsdom',
  
  // Setup file remains the same
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Test file patterns
  testMatch: [
    '**/tests/unit/**/*.test.[jt]s?(x)',
    '**/tests/integration/**/*.test.[jt]s?(x)',
  ],
  
  // Paths to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/tests/e2e/'
  ],
  
  // Module aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
  },
  
  // Babel transformer
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Transform all node_modules except these
  transformIgnorePatterns: [
    '/node_modules/(?!(bson|mongodb)/)'
  ],
  
  // Test-related configurations
  testTimeout: 60000,
  maxWorkers: 1,
  
  // Coverage
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  
  // TypeScript configuration for Jest
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.jest.json',
    },
  },
  
  // ESM related configurations
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node', 'mjs'],
};

module.exports = createJestConfig(customJestConfig);
