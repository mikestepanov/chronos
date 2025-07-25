# Chronos - Timesheet Reminder Bot

## 📋 TLDR - Quick Reference

### System Overview
- **Purpose**: Automated timesheet reminders and compliance tracking for Pumble
- **Pay Periods**: 2-week periods ending on Sundays
- **Data Source**: Kimai timesheet system (via browser automation)

### Reminder Schedule
1. **Test Reminder**: Daily 9 AM CST → `bot-testing` channel
2. **Monday Reminder**: Mondays 9 AM CST → `dev` & `design` channels

### Key Commands
```bash
# Pull latest timesheet data
pnpm run pull-kimai

# Send reminders
./scripts/send-timesheet-reminder.js -c dev
./scripts/send-compliance-status.js  # DM to Mikhail

# Deploy to Koyeb
cd koyeb && node deploy.js
```

### Architecture
- `/scripts` - CLI entry points (orchestration)
- `/kimai/services` - Kimai integration (browser automation)
- `/shared` - Core utilities (pay periods, messaging)
- `/config` - JSON configuration files
- `/koyeb` - Cloud deployment (cron jobs)

### Environment Variables
```env
PUMBLE_API_KEY=xxx      # Required
KIMAI_USERNAME=xxx      # Required  
KIMAI_PASSWORD=xxx      # Required
```

---

## 📚 Comprehensive Documentation

For detailed documentation on all aspects of the Chronos system, please see the **[docs](./docs)** directory:

- **[Getting Started](./docs/getting-started.md)** - Setup and first steps
- **[Architecture Overview](./docs/architecture.md)** - System design and patterns
- **[Scripts Reference](./docs/scripts.md)** - Available scripts and usage
- **[Configuration Guide](./docs/configuration.md)** - All configuration options
- **[Development Guide](./docs/development.md)** - Contributing and best practices

## Quick Overview

Chronos is a timesheet reminder bot for Pumble that helps teams stay compliant with timesheet submissions. It integrates with Kimai for timesheet data and sends automated reminders via Pumble.

### Key Features

- 🤖 **Browser-based Kimai extraction** - Reliable data export using Playwright
- 📊 **Compliance reporting** - Automatic hours tracking and deviation alerts
- 💬 **Unified messaging** - Single CLI for all communication needs
- 📅 **Smart scheduling** - Automated reminders based on pay periods
- 🔧 **Configuration-driven** - Easy customization without code changes

## Quick Reference

### Extract Latest Pay Period Data

```bash
# Pull latest complete pay period with compliance report
pnpm run pull-kimai

# Show browser during extraction
PLAYWRIGHT_HEADLESS=false pnpm run pull-kimai
```

### Send Messages

```bash
# Quick message to channel
./scripts/send-message.js -c dev -m "Hello team!"

# Use template
./scripts/send-message.js -t timesheet-reminder -s name=John -s hours=75

# Interactive mode
./scripts/send-message.js interactive
```

### Key Architecture Principles

1. **Scripts orchestrate, services implement** - Scripts in `/scripts` coordinate but don't contain business logic
2. **Configuration-driven** - All settings in JSON files, only secrets in .env
3. **Platform agnostic** - Messaging abstracted through factories
4. **Separation of concerns** - Clear boundaries between layers

### Environment Variables (Minimal)

```env
# Only 3 required credentials
PUMBLE_API_KEY=your-api-key
KIMAI_USERNAME=admin@example.com  
KIMAI_PASSWORD=your-password
```

All other configuration is in JSON files under `/config`.

## For Detailed Information

Please refer to the comprehensive documentation in the **[docs](./docs)** directory for:
- Complete setup instructions
- All available scripts and options
- Configuration reference
- API documentation
- Development guidelines
- Troubleshooting guides

## Important Guidelines

**NEVER SEND MESSAGES TO DEV OR DESIGN TEAM CHANNELS UNLESS EXPLICITLY SPECIFIED BY THE USER**