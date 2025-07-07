# Bots

This folder contains all bot implementations and automation systems.

## Contents

### Discord Bot
- `start_discord_bot.sh` - Discord bot startup script
- `discord_bot.log` - Discord bot activity log
- `claude_worker.py` - Claude integration for Discord

### Telegram Bot
- `telegram_claude_bridge.py` - Telegram-Claude bridge implementation
- `telegram_claude_cloud.py` - Cloud-based Telegram bot
- `telegram_claude_setup.md` - Setup guide for Telegram bot

### Pumble Bot
- `pumble-bot-docs/` - Pumble bot documentation
  - Free hosting guide
  - General bot guide
  - Vercel quick start guide
- `pumble-client.js` - Pumble client implementation

### Kimai Integration
- `kimai/` - Complete Kimai timesheet bot system
  - API integration
  - User mapping
  - Compliance checking
  - Testing suite
- `kimai-extract-timesheets.js` - Timesheet extraction script
- `kimai-pumble-bot.js` - Kimai-Pumble integration
- `kimai-timesheet-bot.js` - Main timesheet bot
- `kimai-scheduler.sh` - Scheduling script
- `kimai-data/` - Extracted timesheet data by pay period
- `KIMAI_API_KEY_GUIDE.md` - API key setup guide
- `KIMAI_EXTRACTION_README.md` - Extraction process documentation

### Monday Reminder System
- `monday-reminder.js` - Monday reminder bot
- `MONDAY_REMINDER.md` - Reminder bot documentation
- `MONDAY_REMINDER_SETUP.md` - Setup guide
- `test-monday-message.js` - Test script for Monday messages

### Bot Infrastructure
- `lib/` - Shared libraries
  - Bot configuration
  - Client implementations (Slack, Teams, Pumble)
  - Timesheet analyzer
  - Pay period calculator
- `api/` - API endpoints
  - `check-timesheets.js`
  - `send-reminder.js`
- `package.json`, `node_modules/` - Node.js dependencies
- `vercel.json` - Vercel deployment configuration

### Documentation
- `BOT_ACCOUNTS_SETUP.md` - Bot account setup guide
- `BOT_PERSONALITIES.md` - Bot personality configurations

## Usage

### Start Discord Bot
```bash
./start_discord_bot.sh
```

### Run Kimai Extraction
```bash
node kimai-extract-timesheets.js
```

### Test Monday Reminder
```bash
node test-monday-message.js
```