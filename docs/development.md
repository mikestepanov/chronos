# Development Guide

## Setting Up Development Environment

### Prerequisites

- Node.js 18+ and pnpm
- Git
- Firefox/Chromium browser
- VS Code or preferred editor

### Initial Setup

1. **Fork and clone:**
   ```bash
   git clone https://github.com/your-fork/chronos.git
   cd chronos
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   pnpm exec playwright install firefox
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Verify setup:**
   ```bash
   pnpm test
   pnpm run pull-kimai -- --dry-run
   ```

## Project Structure

```
chronos/
├── scripts/              # CLI entry points (orchestrators)
├── kimai/               # Kimai-specific code
│   ├── services/        # Business logic services
│   └── scripts/         # Kimai utility scripts
├── services/            # High-level services
├── shared/              # Shared utilities
├── config/              # JSON configurations
├── monday-reminder/     # Monday reminder module
├── api/                 # Serverless functions
├── tests/               # Test files
└── docs/                # Documentation
```

## Coding Standards

### JavaScript Style

- Use ES6+ features
- Async/await over promises
- Descriptive variable names
- JSDoc comments for functions

```javascript
/**
 * Calculate pay period for given date
 * @param {Date} date - Date to check
 * @returns {Object} Period info with number, start, end
 */
async function calculatePayPeriod(date) {
  // Implementation
}
```

### Error Handling

Always use descriptive errors:

```javascript
// Good
throw new Error(`User not found: ${username}`);

// Better
class UserNotFoundError extends Error {
  constructor(username) {
    super(`User not found: ${username}`);
    this.name = 'UserNotFoundError';
    this.username = username;
  }
}
```

### Logging

Use structured logging:

```javascript
// Instead of console.log
const log = require('./shared/logger');

log.info('Processing timesheet', {
  userId: user.id,
  period: periodNumber,
  hours: totalHours
});
```

## Adding Features

### 1. New Script

Create a new orchestrator script:

```javascript
#!/usr/bin/env node
// scripts/my-feature.js

const { program } = require('commander');
const MyService = require('../services/MyService');

program
  .description('My new feature')
  .option('-v, --verbose', 'verbose output')
  .option('-d, --dry-run', 'preview without executing')
  .parse();

async function main() {
  const options = program.opts();
  
  try {
    const service = new MyService(options);
    const result = await service.execute();
    
    console.log('✅ Success:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
```

### 2. New Service

Create a service with single responsibility:

```javascript
// services/MyService.js
class MyService {
  constructor(options = {}) {
    this.options = options;
    this.config = require('./shared/config-loader').load();
  }

  async execute() {
    // Validate inputs
    this.validate();
    
    // Process
    const result = await this.process();
    
    // Return result
    return result;
  }

  validate() {
    if (!this.options.required) {
      throw new Error('Required option missing');
    }
  }

  async process() {
    // Business logic here
  }
}

module.exports = MyService;
```

### 3. New Message Template

Add to `config/message-templates.json`:

```json
{
  "templates": {
    "my-template": {
      "description": "Description of template",
      "template": "Hello {{name}}, your status is {{status}}",
      "variables": ["name", "status"]
    }
  }
}
```

Use it:
```bash
./scripts/send-message.js -t my-template -s name=John -s status=active
```

## Testing

### Unit Tests

Write tests for services:

```javascript
// tests/MyService.test.js
const MyService = require('../services/MyService');

describe('MyService', () => {
  let service;

  beforeEach(() => {
    service = new MyService({ test: true });
  });

  test('validates required options', () => {
    expect(() => service.validate()).toThrow('Required option missing');
  });

  test('processes data correctly', async () => {
    const result = await service.process();
    expect(result).toHaveProperty('success', true);
  });
});
```

### Integration Tests

Test script execution:

```javascript
// tests/integration/my-feature.test.js
const { execSync } = require('child_process');

describe('my-feature script', () => {
  test('shows help', () => {
    const output = execSync('node scripts/my-feature.js --help', {
      encoding: 'utf8'
    });
    expect(output).toContain('My new feature');
  });

  test('dry run works', () => {
    const output = execSync('node scripts/my-feature.js --dry-run', {
      encoding: 'utf8'
    });
    expect(output).toContain('DRY RUN');
  });
});
```

### Manual Testing

Test checklist for new features:

- [ ] Works with --dry-run flag
- [ ] Handles missing config gracefully
- [ ] Provides helpful error messages
- [ ] Works with different environments
- [ ] Doesn't break existing features

## Debugging

### Enable Debug Logging

```bash
# Set DEBUG environment variable
DEBUG=* pnpm run pull-kimai

# Or specific namespace
DEBUG=chronos:* node scripts/my-feature.js
```

### Show Browser During Automation

```bash
PLAYWRIGHT_HEADLESS=false pnpm run pull-kimai
```

### Inspect Configuration

```bash
node -e "console.log(JSON.stringify(require('./shared/config-loader').load(), null, 2))"
```

### Test Specific Components

```javascript
// Debug specific service
node -e "
  const Service = require('./services/MyService');
  const s = new Service({ verbose: true });
  s.execute().then(console.log).catch(console.error);
"
```

## Common Patterns

### Orchestrator Pattern

Scripts coordinate but don't implement:

```javascript
// Good - scripts/process-data.js
const DataFetcher = require('../services/DataFetcher');
const DataProcessor = require('../services/DataProcessor');
const ReportGenerator = require('../services/ReportGenerator');

async function processData() {
  const fetcher = new DataFetcher();
  const processor = new DataProcessor();
  const generator = new ReportGenerator();
  
  const rawData = await fetcher.fetch();
  const processed = processor.process(rawData);
  const report = generator.generate(processed);
  
  return report;
}
```

### Service Pattern

Services encapsulate business logic:

```javascript
// Good - services/DataProcessor.js
class DataProcessor {
  process(data) {
    return data
      .filter(this.isValid)
      .map(this.transform)
      .reduce(this.aggregate, {});
  }
  
  isValid(item) {
    return item.value > 0;
  }
  
  transform(item) {
    return {
      ...item,
      normalized: item.value / 100
    };
  }
  
  aggregate(acc, item) {
    acc[item.id] = item;
    return acc;
  }
}
```

### Factory Pattern

Create instances based on configuration:

```javascript
class NotificationFactory {
  static create(type, config) {
    switch(type) {
      case 'pumble':
        return new PumbleNotifier(config);
      case 'slack':
        return new SlackNotifier(config);
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  }
}
```

## Refactoring Opportunities

Current areas identified for improvement:

### High Priority

1. **Error Handling Consolidation** ✅ COMPLETED
   - Created `shared/error-handler.js` with ErrorHandler class
   - Provides async wrapping, logging, and retry functionality
   - Custom error types for common scenarios
   - Example usage in `pumble-client.js`

2. **Large File Breakdown**
   - Split MessageSender into smaller services
   - Extract template handling
   - Separate scheduling logic

3. **Logging Service** ✅ COMPLETED
   - Created `shared/logger.js` with structured logging
   - Supports multiple log levels (ERROR, WARN, INFO, DEBUG, TRACE)
   - JSON format for production, pretty format for development
   - Child loggers for module context
   - Example usage in `scripts/pull-kimai.js`

### Medium Priority

1. **Date Utilities** ✅ COMPLETED
   - Created centralized DateHelper class in `shared/date-helper.js`
   - Provides consistent date formatting across the codebase
   - Reduces duplication of date-fns imports

2. **Configuration Service**
   - Use ConfigLoader consistently
   - Add configuration validation
   - Environment-specific configs

3. **Caching Layer**
   - Add caching utilities
   - Cache API responses
   - Cache processed data

### Implementation Example

Refactoring error handling:

```javascript
// shared/error-handler.js
class ErrorHandler {
  static async wrap(fn, context = {}) {
    try {
      return await fn();
    } catch (error) {
      this.log(error, context);
      throw this.enhance(error, context);
    }
  }
  
  static log(error, context) {
    console.error({
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }
  
  static enhance(error, context) {
    error.context = context;
    return error;
  }
}

// Usage
async function riskyOperation() {
  return ErrorHandler.wrap(async () => {
    // Your code here
  }, { operation: 'fetchData', userId: 123 });
}
```

## Contributing

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes and test
4. Update documentation
5. Submit PR with description

### PR Checklist

- [ ] Tests pass
- [ ] Documentation updated
- [ ] No console.log left
- [ ] Follows coding standards
- [ ] Includes examples

### Commit Messages

Use conventional commits:
```
feat: add slack integration
fix: correct timezone handling in pay period calc
docs: update API documentation
refactor: extract message formatting logic
test: add tests for GroupDMService
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Commander.js Guide](https://github.com/tj/commander.js)
- [Date-fns Documentation](https://date-fns.org/)
- [Pumble API Reference](https://pumble.com/api/docs)