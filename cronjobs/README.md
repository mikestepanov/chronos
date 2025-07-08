# Cron Jobs

Thin cron job scripts that only handle scheduling. All business logic is in services.

## Architecture

```
cronjobs/
├── biweekly-reminder.js    # Just calls BiweeklyReminderService.run()
├── followup-reminder.js    # Just calls FollowupReminderService.run()
└── README.md

kimai/services/
├── BiweeklyReminderService.js    # All biweekly logic
├── FollowupReminderService.js    # All follow-up logic
└── GroupDMService.js             # Group DM functionality
```

## Jobs

### 1. Biweekly Reminder (`biweekly-reminder.js`)
- **Schedule**: Every Monday at 7 AM and 8:30 AM CST
- **What it does**: Calls `BiweeklyReminderService.run(type)`
- **Service handles**: Pay period checking, message formatting, sending

```bash
# Test advance notice (7 AM)
node biweekly-reminder.js advance

# Test team reminders (8:30 AM)
node biweekly-reminder.js reminder
```

### 2. Follow-up Reminder (`followup-reminder.js`)
- **Schedule**: Daily at 3 PM CST
- **What it does**: Calls `FollowupReminderService.run()`
- **Service handles**: Tracking, 24-hour checks, group DMs or channel messages

```bash
# Run follow-up check
node followup-reminder.js
```

## Crontab Setup

```bash
# Production crontab entries (UTC times)
# Biweekly - Monday 7 AM CST (1 PM UTC)
0 13 * * 1 cd /path/to/chronos/cronjobs && node biweekly-reminder.js advance

# Biweekly - Monday 8:30 AM CST (2:30 PM UTC)
30 14 * * 1 cd /path/to/chronos/cronjobs && node biweekly-reminder.js reminder

# Follow-up - Daily 3 PM CST (9 PM UTC)
0 21 * * * cd /path/to/chronos/cronjobs && node followup-reminder.js
```

## Environment Variables

Required in `.env`:
```
KIMAI_API_URL=https://your-kimai.com
KIMAI_API_KEY=your-key

PUMBLE_GENERAL_WEBHOOK_URL=https://app.pumble.com/hooks/xxx
PUMBLE_DEV_WEBHOOK_URL=https://app.pumble.com/hooks/yyy
PUMBLE_DESIGN_WEBHOOK_URL=https://app.pumble.com/hooks/zzz
```

## Data Storage

Follow-up tracking is stored in `data/followup-tracking.json` and auto-cleaned after 60 days.