// Test setup file for Jest

// Set test environment
process.env.NODE_ENV = 'test';

// Mock environment variables
process.env.AGENTSMITH_API_KEY = 'test-api-key';
process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID = 'test-dm-channel';
process.env.DEV_CHANNEL_ID = 'test-dev-channel';
process.env.DESIGN_CHANNEL_ID = 'test-design-channel';

// Global test utilities
global.testUtils = {
  // Helper to create a mock date
  mockDate: (dateString) => {
    const mockDate = new Date(dateString);
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    return mockDate;
  },
  
  // Helper to restore real timers
  restoreDate: () => {
    jest.useRealTimers();
  },
  
  // Helper to wait for promises
  flushPromises: () => new Promise(resolve => setImmediate(resolve)),
  
  // Helper to suppress console output during tests
  suppressConsole: () => {
    const originalLog = console.log;
    const originalError = console.error;
    
    beforeEach(() => {
      console.log = jest.fn();
      console.error = jest.fn();
    });
    
    afterEach(() => {
      console.log = originalLog;
      console.error = originalError;
    });
  }
};

// Set longer timeout for integration tests
jest.setTimeout(10000);

// Mock axios globally to prevent actual network requests
jest.mock('axios');

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});