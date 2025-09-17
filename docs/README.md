# Chronos Documentation

Welcome to the Chronos timesheet system documentation. This system automates timesheet tracking, reminders, and compliance reporting for teams using Kimai.

## Quick Links

- [Architecture Overview](./architecture.md) - System design and components
- [Getting Started](./getting-started.md) - Setup and configuration
- [Scripts Reference](./scripts.md) - Available scripts and usage
- [Configuration Guide](./configuration.md) - Configuration files and options
- [Development Guide](./development.md) - Contributing and best practices

## What is Chronos?

Chronos is an automated timesheet management system that:
- 📊 Extracts timesheet data from Kimai using browser automation
- 📅 Tracks pay periods and calculates compliance
- 💬 Sends automated reminders via Pumble
- 📈 Generates hours compliance reports
- 🤖 Provides a unified CLI for messaging

## Key Features

### Automated Data Extraction
- Browser-based Kimai export (no flaky API)
- Versioned storage with deduplication
- Automatic pay period detection

### Smart Reminders
- Monday morning reminders on pay period end
- Follow-up reminders for incomplete timesheets
- Customizable templates and scheduling

### Compliance Reporting
- Hours worked vs expected comparison
- Deviation tracking with thresholds
- Per-user and team summaries

### Unified Messaging
- Single CLI for all messaging needs
- Template-based messages
- Channel, DM, and group DM support

## System Components

```
chronos/
├── scripts/           # Executable scripts (orchestrators)
├── kimai/            # Kimai-specific implementations
│   └── services/     # Browser automation and processing
├── services/         # High-level services (messaging)
├── shared/           # Shared utilities and core logic
├── config/           # JSON configuration files
├── monday-reminder/  # Monday reminder system
└── koyeb/            # Koyeb deployment integration
```

## Quick Start

1. **Pull latest timesheet data:**
   ```bash
   npm run pull-kimai
   ```

2. **Send a message:**
   ```bash
   ./scripts/send-message.js -c dev -m "Hello team!"
   ```

3. **Check Monday reminders:**
   ```bash
   node monday-reminder/monday-reminder.js preview
   ```

See [Getting Started](./getting-started.md) for detailed setup instructions.

## Common Tasks

- [Extract Kimai data for a pay period](./kimai-extraction.md)
- [Send reminders to team](./scripts.md#send-message)
- [Setup Monday reminders](./monday-reminder.md)
- [Configure the system](./configuration.md)

## For Developers

- [Architecture patterns](./architecture.md#design-principles)
- [Adding new features](./development.md#adding-features)
- [Testing guidelines](./development.md#testing)
- [Refactoring opportunities](./development.md#refactoring)