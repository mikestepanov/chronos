# Bots Directory Structure

[![Test Bots](https://github.com/username/omega/workflows/Test%20Bots/badge.svg)](https://github.com/username/omega/actions/workflows/test-bots.yml)
[![Bot Quality Checks](https://github.com/username/omega/workflows/Bot%20Quality%20Checks/badge.svg)](https://github.com/username/omega/actions/workflows/bot-quality-checks.yml)

## ⚠️ CRITICAL: Pumble Message Sending
**NEVER use `asBot: true` when sending Pumble messages!**
- Agent Smith bot authenticates as a real user, not a bot
- Messages should appear from "Agent Smith" user
- Always use: `sendMessage(channelId, text)` or `sendMessage(channelId, text, false)`
- This applies to ALL Pumble integrations in this codebase

## Overview
This directory contains various bot implementations for different platforms and purposes.

## Directory Structure

### Platform-Specific Bots
- **`discord/`** - Discord bot implementation
- **`telegram/`** - Telegram bot bridges
- **`pumble/`** - Pumble messaging bot and tests
- **`kimai/`** - Kimai timesheet integration bot

### Feature Bots
- **`monday-reminder/`** - Automated Monday timesheet reminders
  - Main bot with resilient notification system
  - Advance notification (1 hour before)
  - Multiple scheduling options

### Shared Resources
- **`shared/`** - Shared libraries used by multiple bots
  - `pumble-client.js` - Pumble API client
  - `pay-period-calculator.js` - Pay period calculations
  - `resilient-sender.js` - Retry logic with exponential backoff
  - `messaging-factory.js` - Platform abstraction layer

### Other Directories
- **`api/`** - Serverless function endpoints
- **`scripts/`** - Utility scripts and tools
- **`tests/`** - General test files
- **`docs/`** - Documentation and setup guides
- **`deployment/`** - Deployment configurations
- **`kimai-data/`** - Extracted timesheet data (consider moving to `/misc/data/`)

## Quick Start

### Monday Reminders
```bash
# Test the reminder system
node monday-reminder/monday-reminder.js preview

# Set up cron (runs at 8 AM and 9 AM on Mondays)
0 8 * * 1 cd /path/to/omega/bots && node monday-reminder/send-advance-notification-resilient.js
0 9 * * 1 cd /path/to/omega/bots && node monday-reminder/monday-reminder.js send
```

### Pumble Bot
```bash
# Test Pumble connection
node pumble/tests/test-pumble-api.js

# Run Kimai-Pumble integration
node pumble/kimai-pumble-bot.js
```

## Key Features

1. **Resilient Message Sending** - 5 retry attempts with smart delays
2. **Advance Notifications** - 1-hour notice for scheduled messages
3. **Multi-Platform Support** - Pumble, Slack, Teams ready
4. **Pay Period Tracking** - Automatic calculation of bi-weekly periods
5. **Error Recovery** - Comprehensive error handling and logging

## Documentation

See the `docs/` directory for:
- `CRON_SETUP.md` - Setting up scheduled tasks
- `GET_PUMBLE_API_KEY.md` - Pumble API authentication
- `MONITORING_SETUP.md` - Monitoring and alerting
- `BOT_PERSONALITIES.md` - Bot personality system