module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'shared/**/*.js',
    'monday-reminder/**/*.js',
    'pumble/**/*.js',
    'kimai/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/*.test.js',
    '!**/*.spec.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 10000,
  
  // Setup files
  // setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Module name mapper for our structure
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@monday-reminder/(.*)$': '<rootDir>/monday-reminder/$1',
    '^@pumble/(.*)$': '<rootDir>/pumble/$1',
    '^@kimai/(.*)$': '<rootDir>/kimai/$1'
  }
};