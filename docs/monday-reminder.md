# Monday Pay Period Reminders

## Overview

The Monday reminder system automatically sends pay period submission reminders when Monday is the last day of a pay period. Messages are sent at 7 AM CST to ensure teams submit their timesheets before the period closes.

## How It Works

### Automatic Scheduling
- Calculates current pay period based on configured start date
- Identifies when Monday is the last day of a 14-day period
- Sends reminders only on these specific Mondays
- Uses Agent Smith persona for consistent communication

### Pay Period Calculation
Starting from Period 18 (ending June 23, 2025):
- Each period is exactly 14 days
- Periods end on alternating Mondays
- Payments process 7 days after period end

## Message Format

Agent Smith delivers reminders in his characteristic formal style:

```
🕴️ System Notice: Pay Period 19th Termination

Good Morning Team.

The current pay period cycle reaches its inevitable termination today.

System Requirements:
• Submit all temporal data by end of day today (July 7th)
• Current cycle encompasses: 6/24 – 7/7
• Today (July 7th) is the final day of period 19
• Tomorrow (July 8th) initiates period 20

Additional Directives:
• Those assigned supplementary hours must include them in current submissions
• All entries require proper documentation and categorization

Processing Timeline:
• Payment transmission scheduled: July 14th
• System processing is automatic and inevitable

Compliance is not optional. Direct queries to management if clarification is required.

~ Agent Smith
```

## Setup Options

### Option 1: GitHub Actions (Recommended)

**Required Secrets:**
- `PUMBLE_API_KEY` - Pumble bot API key
- `DEV_CHANNEL_ID` - Development channel ID
- `DESIGN_CHANNEL_ID` - Design channel ID
- `BOT_EMAIL` - Bot email address
- `BOT_ID` - Bot Pumble ID

The workflow runs automatically every Monday at 7 AM CST.

### Option 2: Cron Job

Add to your crontab:
```bash
# Run at 7 AM CST every Monday
0 12 * * 1 cd /path/to/chronos && npm run monday
```

### Option 3: Manual Execution

```bash
# Send reminder (only on valid Mondays)
npm run monday

# Force send for testing
npm run monday:test

# Preview message
node monday-reminder/monday-reminder.js preview

# Show schedule
node monday-reminder/monday-reminder.js schedule 10
```

## Configuration

In `config/pay-period.json`:
```json
{
  "startDate": "2024-01-01",
  "lengthDays": 14,
  "workDays": 10,
  "referencePayPeriod": {
    "number": 18,
    "endDate": "2025-06-23"
  }
}
```

In `config/monday-reminder.json`:
```json
{
  "enabled": true,
  "testMode": false,
  "channels": {
    "dev": "${DEV_CHANNEL_ID}",
    "design": "${DESIGN_CHANNEL_ID}"
  },
  "schedule": {
    "time": "07:00",
    "timezone": "America/Chicago"
  }
}
```

## Schedule Preview

| Period | Reminder Date | Payment Date | Period Range |
|--------|--------------|--------------|--------------|
| 19 | July 7, 2025 | July 14, 2025 | Jun 24 - Jul 7 |
| 20 | July 21, 2025 | July 28, 2025 | Jul 8 - Jul 21 |
| 21 | August 4, 2025 | August 11, 2025 | Jul 22 - Aug 4 |
| 22 | August 18, 2025 | August 25, 2025 | Aug 5 - Aug 18 |

## Integration with Kimai Extraction

The Monday reminder system can trigger automatic Kimai extraction:
1. Checks if data exists for the ending period
2. If missing, triggers extraction before sending reminder
3. Includes compliance summary in reminder if configured

## Testing

### Preview Commands
```bash
# Preview today's message
node monday-reminder/monday-reminder.js preview

# Preview specific date
node monday-reminder/monday-reminder.js preview 2025-07-21

# Test send to channels
node monday-reminder/monday-reminder.js test
```

### Validation
The system validates:
- Current date is Monday
- Monday is the last day of a pay period
- All required configuration is present
- Channel IDs are valid

## Troubleshooting

### Common Issues

1. **"Not the last day of period" Error**
   - Reminder only sends on valid Mondays
   - Use test mode to bypass validation
   - Check pay period calculations

2. **Missing Configuration**
   - Verify all environment variables
   - Check channel IDs are correct
   - Ensure bot has channel access

3. **Timezone Issues**
   - GitHub Actions use UTC
   - 7 AM CST = 12/13 PM UTC (DST dependent)
   - Adjust cron schedule accordingly

### Debug Mode
```bash
# Enable debug output
DEBUG=monday-reminder:* npm run monday

# Check calculations
node monday-reminder/monday-reminder.js validate
```

## Best Practices

1. **Test First**: Always preview before sending
2. **Monitor Logs**: Check GitHub Actions logs for issues
3. **Verify Schedule**: Use schedule command to confirm dates
4. **Update Persona**: Keep Agent Smith's message style consistent
5. **Channel Access**: Ensure bot remains in all target channels