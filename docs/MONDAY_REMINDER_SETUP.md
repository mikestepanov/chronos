# Monday Reminder Setup Guide

## How to Send Monday Reminders

### Option 1: Automated via GitHub Actions (Recommended)

The reminder will automatically send every Monday at 7 AM CST when it's the last day of a pay period.

**Setup Steps:**

1. Go to your GitHub repository settings
2. Navigate to Settings → Secrets and variables → Actions
3. Add these required secrets:
   - `PUMBLE_API_KEY` - Your Pumble bot API key
   - `DEV_CHANNEL_ID` - The dev channel ID (e.g., C-dev-channel-id)
   - `DESIGN_CHANNEL_ID` - The design channel ID (e.g., C-design-channel-id)
   - `BOT_EMAIL` - Bot email address
   - `BOT_ID` - Bot Pumble ID

4. The workflow will run automatically every Monday at 7 AM CST
5. It only sends when Monday is the last day of a pay period

### Option 2: Manual Command Line

**One-time setup:**
```bash
cd scripts
npm install
```

**Create .env file:**
```bash
# Create scripts/.env with:
MESSAGING_PLATFORM=pumble
PUMBLE_API_KEY=your-pumble-api-key
DEV_CHANNEL_ID=C-dev-channel-id
DESIGN_CHANNEL_ID=C-design-channel-id
BOT_EMAIL=bot@company.com
BOT_ID=bot-pumble-id
KIMAI_URL=https://kimai.example.com
KIMAI_API_KEY=dummy-key
```

**Send reminder (only works on last day of period):**
```bash
cd scripts
npm run monday
# or
node monday-reminder.js send
```

**Force send for testing:**
```bash
cd scripts
npm run monday:test
# or
node monday-reminder.js test
```

### Option 3: Manual GitHub Action Trigger

1. Go to Actions tab in your GitHub repository
2. Select "Monday Pay Period Reminder" workflow
3. Click "Run workflow"
4. Check "Run in test mode" to bypass date check
5. Click "Run workflow" button

## Preview Messages

**Preview today's message:**
```bash
cd scripts
node monday-reminder.js preview
```

**Preview specific date:**
```bash
cd scripts
node monday-reminder.js preview 2025-07-21
```

**Show next 10 pay periods:**
```bash
cd scripts
node monday-reminder.js schedule 10
```

## Message Format

The bot sends this message to both dev and design channels:

```
Good Morning Team,

A Quick Reminder: The 19th pay-period is fast approaching!

Please begin to input Kimai data today (July 7th) end of day. Please note that this paycheck will account for the full 2 weeks. This 19th payroll period will include the dates from 6/24 – 7/7. (Meaning that today (July 7th) is also counted for the 19th pay-period, TOMORROW (July 8th) is counted for the 20th pay-period.)

For those of you that have been given extra hours, please ensure to input them into Kimai for this pay-period as well.

Please expect the payment to go through on the July 14th.

If you have any questions or concerns, please do not hesitate to reach out to me.

Thank you.

@here
```

## Schedule

Starting from Period 18 (ending June 23, 2025), reminders are sent:

| Period | Reminder Date (Monday) | Payment Date |
|--------|------------------------|--------------|
| 18 | June 23, 2025 | June 30, 2025 |
| 19 | July 7, 2025 | July 14, 2025 |
| 20 | July 21, 2025 | July 28, 2025 |
| 21 | August 4, 2025 | August 11, 2025 |
| 22 | August 18, 2025 | August 25, 2025 |

The pattern continues every 14 days.

## Troubleshooting

**"Not the last day of period" error:**
- The reminder only sends on Mondays that are the last day of a pay period
- Use `test` mode to bypass this check

**Missing configuration:**
- Ensure all required environment variables are set
- Check .env file or GitHub secrets

**Wrong timezone:**
- The cron job uses UTC time
- 7 AM CST = 12 PM UTC (during DST) or 1 PM UTC (standard time)
- Adjust the cron schedule in the workflow file if needed