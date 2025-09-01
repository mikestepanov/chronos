# Claude Development Guidelines

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
npm run pull-kimai

# Show browser during extraction
PLAYWRIGHT_HEADLESS=false npm run pull-kimai
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
# Required credentials
PUMBLE_API_KEY=your-api-key
KIMAI_USERNAME=admin@example.com  
KIMAI_PASSWORD=your-password
KOYEB_API_KEY=your-koyeb-api-key  # For deployments
```

All other configuration is in JSON files under `/config`.

### Koyeb Deployment

The app is deployed on Koyeb with GitHub integration. Changes pushed to the `first` branch auto-deploy.

**Current Cron Schedule:**
- **Keep-alive**: Every 10 minutes - sends "Keep-alive check: HH:MM CST" to bot-testing
- **Daily Reminder**: 11:50 AM CST - sends to bot-testing channel
- **Monday Reminder**: 1 PM CST - sends to dev & design (only on pay period end days)

**To Deploy:**
1. Push changes to GitHub `first` branch
2. Koyeb auto-deploys within a few minutes
3. Check status at: https://app.koyeb.com/apps/chronos-bot
4. Live URL: https://chronos-bot.koyeb.app

**Manual Trigger Endpoints:**
```bash
# Test reminder
curl -X POST https://chronos-bot.koyeb.app/trigger/test \
  -H "x-webhook-secret: test-secret-123"

# Monday reminder (forces send regardless of date)
curl -X POST https://chronos-bot.koyeb.app/trigger/monday \
  -H "x-webhook-secret: test-secret-123"
```

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