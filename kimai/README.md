# Kimai Timesheet System

A modular system for extracting and managing Kimai timesheet data with proper separation of concerns.

## Architecture

```
kimai/
├── core/               # Core business logic (no external dependencies)
│   ├── PayPeriod.js   # Pay period calculations
│   └── types.js       # Shared type definitions
├── services/          # External service integrations
│   ├── KimaiAPI.js    # Kimai API client (only API calls)
│   └── CSVParser.js   # CSV parsing utilities
├── storage/           # Data persistence layer
│   ├── FileStorage.js # File-based storage implementation
│   └── Storage.js     # Storage interface
├── config/            # Configuration management
│   └── index.js       # Centralized configuration
├── cli/               # Command-line interfaces
│   ├── extract.js     # Manual extraction commands
│   └── query.js       # Query historical data
└── tests/             # Test files

# Main entry points
index.js               # Main extraction service
scheduler.js           # Automated scheduling
```

## Design Principles

1. **Single Responsibility**: Each module has one clear purpose
2. **Dependency Injection**: Services receive dependencies, don't create them
3. **Interface Segregation**: Storage layer has clear interface, implementations can vary
4. **Configuration Isolation**: All config in one place
5. **Testability**: Each component can be tested in isolation

## Storage Options

### 1. File Storage (Default)
Simple file-based storage with versioning.

### 2. Git Storage
Automatically commits and optionally pushes CSV versions to a Git repository.

```bash
# Enable Git storage
STORAGE_TYPE=git

# Auto-commit each extraction (default: true)
GIT_AUTO_COMMIT=true

# Auto-push to remote (default: false)
GIT_AUTO_PUSH=true

# Remote and branch settings
GIT_REMOTE=origin
GIT_BRANCH=main
```

## Usage

```bash
# Extract current pay period
node kimai/cli.js extract

# Extract specific period
node kimai/cli.js extract --period 2024-01-01

# View extraction history
node kimai/cli.js history --period 2024-01-01

# Compare versions
node kimai/cli.js compare --period 2024-01-01 1 2

# Check system status
node kimai/cli.js status
```