# Monday Reminder Bot

A robust, reusable bot for sending automated timesheet reminders every Monday.

## Features

- **Automated Scheduling**: Sends reminders on the last Monday of each pay period
- **Advance Notifications**: 1-hour advance notice to designated users
- **Multi-Channel Support**: Sends to multiple Pumble channels (#dev, #design)
- **Pay Period Tracking**: Automatically calculates pay periods and payment dates
- **Test Modes**: Preview and test commands for verification
- **GitHub Actions Integration**: Runs automatically via cron schedule

## Setup

### Environment Variables

```bash
# Required
MESSAGING_PLATFORM=pumble
PUMBLE_API_KEY=your_api_key
KIMAI_URL=https://kimai.starthub.academy
KIMAI_API_KEY=your_kimai_key

# Optional but recommended
BOT_TO_MIKHAIL_DM_CHANNEL_ID=channel_id  # For advance notifications
DEV_CHANNEL_ID=channel_id                 # Dev channel
DESIGN_CHANNEL_ID=channel_id              # Design channel
MIKHAIL_PUMBLE_ID=user_id                 # User to receive advance notices
```

### GitHub Actions

The bot runs automatically via GitHub Actions:
- **6 AM CST**: Sends 1-hour advance notice
- **7 AM CST**: Sends main reminders to channels

See `.github/workflows/monday-reminder.yml` for configuration.

## Usage

### Command Line Interface

```bash
# Production Commands
node monday-reminder.js send      # Send immediately (checks if last day)
node monday-reminder.js run       # Schedule with Smart Scheduler
node monday-reminder.js advance   # Send advance notice only

# Testing Commands
node monday-reminder.js test         # Test with 5-minute delay
node monday-reminder.js immediate    # Send test immediately
node monday-reminder.js test-preview # Send preview to your DM

# Utility Commands
node monday-reminder.js preview [date]  # Preview message for specific date
node monday-reminder.js schedule [n]    # Show next N pay periods
```

### Programmatic Usage

```javascript
const MondayReminderBot = require('./monday-reminder');

const bot = new MondayReminderBot();

// Send advance notification
await bot.sendAdvanceNotification();

// Send main reminder
await bot.sendMondayReminder({
  channels: ['dev', 'design'],
  includeExtraHours: true
});

// Send test preview
await bot.sendTestPreview();
```

## Message Format

### Advance Notice (6 AM)
```
🔔 Monday Reminder - 1 Hour Notice

⏰ Reminders will be sent at: 9:00 AM
📍 Target Channels: #dev, #design
📋 Type: Monday Timesheet Reminder

📊 Pay Period Details:
• Period: 19
• Dates: 6/24 - 7/7
• Payment: Jul 14
```

### Main Reminder (7 AM)
```
Good Morning Team,

A Quick Reminder: The 19th pay-period is fast approaching!

Please begin to input Kimai data today (Monday, July 7, 2025) end of day...
[Full timesheet reminder details]
```

## Architecture

### Core Components

1. **MondayReminderBot** - Main class with all reminder logic
2. **PayPeriodCalculator** - Handles pay period calculations
3. **MessagingFactory** - Creates platform-specific clients
4. **SmartScheduler** - Handles scheduled messages
5. **PumbleClient** - Pumble API integration

### Reusability

The bot is designed to be reusable:
- Configuration via environment variables
- Platform-agnostic messaging (supports Pumble, Slack, Teams)
- Modular architecture with shared components
- Comprehensive error handling
- Test modes for verification

## Testing

### Manual Testing

```bash
# Test advance notification
BOT_TO_MIKHAIL_DM_CHANNEL_ID=your_channel node monday-reminder.js advance

# Test full preview
node monday-reminder.js test-preview

# Check pay periods
node monday-reminder.js schedule 10
```

### Automated Tests

```bash
npm test:monday  # Run unit tests
```

## Troubleshooting

### Common Issues

1. **"No channel IDs configured"**
   - Set DEV_CHANNEL_ID and DESIGN_CHANNEL_ID in environment

2. **"Failed to send DM"**
   - Ensure BOT_TO_MIKHAIL_DM_CHANNEL_ID is set
   - Verify PUMBLE_API_KEY is valid

3. **"Not last day of period"**
   - Use test modes to bypass date checks
   - Check schedule with `node monday-reminder.js schedule`

### Debug Mode

Set `DEBUG=monday-reminder` for verbose logging.

## Important Notes

- **NEVER use `asBot: true`** - Messages should appear from Agent Smith user
- The bot only sends on the last Monday of each pay period
- All times are in CST
- GitHub Actions must have all required secrets configured