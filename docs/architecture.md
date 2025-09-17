# Architecture Overview

## System Design

Chronos follows a modular architecture with clear separation of concerns:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   CLI Scripts   │────▶│  Core Services   │────▶│ External APIs   │
│  (Orchestrate)  │     │ (Business Logic) │     │ (Kimai, Pumble) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                         │
         └───────────┬───────────┘                         │
                     ▼                                     │
            ┌─────────────────┐                           │
            │ Shared Utilities│◀──────────────────────────┘
            │  (Core Logic)   │
            └─────────────────┘
```

## Directory Structure

### `/scripts`
Executable scripts that orchestrate workflows. These are entry points that coordinate services but contain no business logic.

**Key Scripts:**
- `pull-kimai.js` - Orchestrates Kimai data extraction
- `send-message.js` - Unified messaging CLI
- `identify-pay-period.js` - Analyzes CSV pay periods

### `/kimai/services`
Kimai-specific service implementations using browser automation.

**Core Services:**
- `KimaiExporter` - Playwright browser automation
- `TimesheetProcessor` - CSV parsing and filtering
- `HoursReportGenerator` - Compliance reporting
- `StorageService` - Versioned data persistence
- `GroupDMService` - Pumble group messaging

### `/services`
High-level services that coordinate multiple subsystems.

**Services:**
- `MessageSender` - Unified messaging interface

### `/shared`
Shared utilities and core business logic used across the system.

**Utilities:**
- `pay-period-calculator.js` - Pay period calculations
- `pumble-client.js` - Low-level Pumble API
- `config-loader.js` - Configuration management
- `messaging-factory.js` - Platform abstraction
- `timesheet-analyzer.js` - Timesheet analysis

### `/config`
JSON configuration files for all aspects of the system.

**Configurations:**
- `app.json` - Application settings
- `channels.json` - Channel mappings
- `users/users.json` - User directory
- `message-templates.json` - Message templates
- `bots.json` - Bot identities

### `/monday-reminder`
Specialized module for Monday pay period reminders.

### `/koyeb`
Koyeb deployment integration for cloud hosting.

## Design Principles

### 1. Separation of Concerns
- Scripts orchestrate, services implement
- Business logic in services, not scripts
- External API calls isolated in specific services

### 2. Configuration-Driven
- All settings in JSON files
- Environment variables only for secrets
- Easy customization without code changes

### 3. Error Handling
- Services throw descriptive errors
- Scripts handle and log errors
- Graceful degradation where possible

### 4. Testability
- Pure functions where possible
- Dependency injection
- Mock-friendly interfaces

### 5. Modularity
- Single responsibility per module
- Minimal cross-dependencies
- Clear interfaces between layers

## Data Flow

### Kimai Data Extraction (Browser-Based)
```
User Request → pull-kimai.js → KimaiExporter
                                    ↓
                              Playwright Browser
                                    ↓
                           Login → Navigate → Export
                                    ↓
                              CSV Download
                                    ↓
              TimesheetProcessor ← Parse & Filter
                                    ↓
              HoursReportGenerator → Compliance Report
                                    ↓
               StorageService → Versioned Storage
                                    ↓
                            Deduplication Check
```

### Message Sending
```
User Command → send-message.js → MessageSender
                                      ↓
                              Template Processing
                                      ↓
                               Channel Resolution
                                      ↓
                               PumbleClient → API
```

### Versioned Storage Pattern
```
kimai-data/
├── 2025-07-08/              # Pay period directory
│   ├── metadata.json        # Version tracking
│   ├── v1.csv              # Initial export
│   ├── v2.csv              # Updated (if different)
│   └── hours-report.txt    # Generated report
```

## Key Patterns

### Factory Pattern
```javascript
// messaging-factory.js
const messaging = MessagingFactory.create('pumble', config);
```

### Singleton Configuration
```javascript
// config-loader.js
const config = ConfigLoader.load(); // Same instance always
```

### Service Layer
```javascript
// Services handle business logic
class KimaiExporter {
  async exportTimesheet(startDate, endDate) {
    // Complex browser automation
  }
}
```

### Orchestration
```javascript
// Scripts coordinate services
async function pullKimaiData() {
  const exporter = new KimaiExporter();
  const processor = new TimesheetProcessor();
  
  const data = await exporter.export();
  const processed = processor.process(data);
  // ...coordinate flow
}
```

## Security Considerations

1. **Credentials**: Only in environment variables
2. **API Keys**: Never in code or configs  
3. **Browser Security**: Isolated browser contexts
4. **Validation**: Input validation at service boundaries
5. **Logging**: No sensitive data in logs
6. **Access**: Service-level access control

## Performance Considerations

1. **Browser Automation**: 
   - Headless mode for speed
   - Configurable timeouts
   - Resource cleanup after each session
2. **Deduplication**: 
   - Checksum-based comparison
   - Skip redundant exports
3. **Caching**: 
   - 30-second request cache
   - File-based storage
4. **Batch Operations**: Process multiple users together
5. **Async Operations**: Non-blocking I/O throughout

## Extensibility

The architecture supports:
- New messaging platforms (Discord, Slack)
- Additional timesheet systems
- Different storage backends
- Custom compliance rules
- Plugin-based extensions

## Future Architecture Goals

1. **Event-Driven**: Move to event-based architecture
2. **Microservices**: Split into smaller services
3. **Queue-Based**: Add message queue for reliability
4. **Observability**: Add metrics and tracing
5. **API Gateway**: Unified API for all operations