# Testing Guide for Bots

## Overview

This guide covers the testing strategy and implementation for the bot systems, focusing on the Monday reminder and Pumble integration.

## Test Structure

```
tests/
├── unit/                    # Fast, isolated unit tests
│   ├── pay-period-calculator.test.js
│   ├── monday-reminder.test.js
│   └── resilient-sender.test.js
├── integration/             # Tests that verify component interactions
│   └── monday-reminder-flow.test.js
├── setup.js                 # Global test configuration
└── fixtures/               # Test data and mocks
```

## Running Tests

### Quick Start
```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific test suites
npm run test:pay-period     # Pay period calculations
npm run test:monday         # Monday reminder bot
npm run test:resilient      # Resilient sender

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Using the Test Runner Script
```bash
# Run all tests
./run-tests.sh

# Run specific suites
./run-tests.sh unit         # Unit tests only
./run-tests.sh integration  # Integration tests only
./run-tests.sh coverage     # With coverage report
./run-tests.sh quick        # Quick smoke test
```

## Test Coverage Areas

### 1. Pay Period Calculator (Critical)
- ✅ Period boundary calculations
- ✅ Payment date calculations  
- ✅ Last day detection
- ✅ Ordinal formatting
- ✅ Year boundary handling
- ✅ Edge cases (leap years, etc.)

### 2. Monday Reminder Bot
- ✅ Sending logic on correct days
- ✅ Message formatting
- ✅ Channel distribution
- ✅ Test mode vs production
- ✅ Error handling
- ✅ Bot personality integration

### 3. Resilient Sender
- ✅ Retry logic with exponential backoff
- ✅ Custom delays for attempts 4 & 5
- ✅ Fallback mechanisms
- ✅ Network connectivity testing
- ✅ Error propagation

### 4. Pumble Integration
- ⚠️ Mocked in tests (no real API calls)
- ✅ Message sending simulation
- ✅ Authentication handling
- ✅ Channel operations

## Writing Tests

### Unit Test Template
```javascript
describe('ComponentName', () => {
  let component;
  
  beforeEach(() => {
    // Setup
    component = new Component();
  });
  
  afterEach(() => {
    // Cleanup
    jest.clearAllMocks();
  });
  
  describe('methodName', () => {
    test('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = component.method(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Integration Test Template
```javascript
describe('Feature Integration', () => {
  beforeEach(() => {
    // Set up environment
    process.env.API_KEY = 'test-key';
    
    // Mock external dependencies only
    jest.mock('axios');
  });
  
  test('should complete full workflow', async () => {
    // Test the entire flow
    const result = await performWorkflow();
    
    // Verify all components worked together
    expect(result.success).toBe(true);
  });
});
```

## Test Data

### Important Test Dates
- **Period 18 End**: June 23, 2025 (Monday)
- **Period 19 End**: July 7, 2025 (Monday)
- **Period 20 End**: July 21, 2025 (Monday)

### Mock Environment Variables
Set in `tests/setup.js`:
- `AGENTSMITH_API_KEY`: 'test-api-key'
- `BOT_TO_MIKHAIL_DM_CHANNEL_ID`: 'test-dm-channel'
- `DEV_CHANNEL_ID`: 'test-dev-channel'
- `DESIGN_CHANNEL_ID`: 'test-design-channel'

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` to reset state
- Mock external dependencies

### 2. Descriptive Test Names
```javascript
// Good
test('should calculate payment date as 7 days after period end')

// Bad
test('payment date test')
```

### 3. Test Coverage Goals
- Aim for >80% coverage on critical components
- 100% coverage on pay period calculations
- Focus on edge cases and error paths

### 4. Mock Appropriately
- Unit tests: Mock all dependencies
- Integration tests: Mock only external services
- Never make real API calls in tests

## Debugging Tests

### Run Single Test
```bash
npm test -- --testNamePattern="should calculate current period"
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### View Coverage Report
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Test Bots
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          directory: ./coverage
```

## Common Issues

### 1. Timezone Issues
- Use fixed times in tests: `new Date('2025-07-07T12:00:00')`
- Set timezone in CI: `TZ=UTC npm test`

### 2. Flaky Tests
- Use `jest.useFakeTimers()` for time-dependent tests
- Ensure proper cleanup in `afterEach`

### 3. Module Caching
- Use `jest.resetModules()` when testing different configurations
- Clear require cache for integration tests

## Next Steps

1. **Add E2E Tests**: Test with real Pumble sandbox API
2. **Performance Tests**: Ensure retry logic doesn't cause issues
3. **Load Tests**: Verify concurrent message handling
4. **Monitoring Tests**: Verify alerting mechanisms work