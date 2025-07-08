# Pay Period Notice Bot

Automated bi-weekly pay period reminders using cron-job.org and Pumble webhooks. This is the v2 implementation that replaces the old monday-reminder system.

## Features

- 🔔 Advance notice at 7 AM CST on pay period end Mondays
- 📧 Main reminders at 8:30 AM CST to different teams
- 🎯 Smart detection - only sends on actual pay period ends
- 🔄 Two setup options: Direct or Webhook-based

## Quick Start

1. **Set up environment variables** in `.env`:
```bash
CRON_JOB_ORG_API_KEY=your-api-key-here
PUMBLE_DEV_WEBHOOK_URL=https://hooks.pumble.com/xxxxxx
PUMBLE_DESIGN_WEBHOOK_URL=https://hooks.pumble.com/yyyyyy
PUMBLE_GENERAL_WEBHOOK_URL=https://hooks.pumble.com/zzzzzz
```

2. **Choose your setup approach**:

### Option A: Direct Integration (Simple)
Sends messages directly to Pumble every Monday:
```bash
node setup.js direct
```
⚠️ This sends EVERY Monday, not just pay period ends

### Option B: Webhook Approach (Smart)
Only sends on actual pay period end days:
```bash
node setup.js webhook
```
Then deploy the webhook server (see below)

## Setup Commands

```bash
# Show current pay period status
node setup.js

# Set up direct Pumble integration
node setup.js direct

# Set up webhook-based integration
node setup.js webhook

# List existing cron jobs
node setup.js list

# Show required environment variables
node setup.js env
```

## Test the Bot Locally

```bash
# Test the bot in test mode
node PayPeriodNoticeBot.js

# Test webhook handler
node webhook-handler.js
```

## Webhook Deployment Options

If using the webhook approach, you need to deploy the webhook server:

### Local Testing
```bash
node webhook-server.js
# Use ngrok to expose locally: ngrok http 3000
```

### Production Deployment

**Option 1: Heroku**
```bash
# Add to package.json scripts:
"start": "node pay-period-notice/webhook-server.js"

# Deploy to Heroku
heroku create your-pay-period-bot
heroku config:set CRON_WEBHOOK_TOKEN=your-secret-token
git push heroku main
```

**Option 2: Vercel**
Create `vercel.json`:
```json
{
  "functions": {
    "api/webhook.js": {
      "runtime": "@vercel/node@18"
    }
  }
}
```

**Option 3: Any VPS**
```bash
# Use PM2 for process management
pm2 start pay-period-notice/webhook-server.js --name pay-period-bot
pm2 save
pm2 startup
```

## How It Works

1. **Cron-job.org** triggers webhooks every Monday at scheduled times
2. **Direct approach**: Sends to Pumble immediately (every Monday)
3. **Webhook approach**: 
   - Receives the trigger
   - Checks if today is the last day of a pay period
   - Only sends notifications if it's actually pay period end

## Pay Period Schedule

- Pay periods are 14 days long
- Period 18 ended on June 23, 2025 (Monday)
- Payments are made 7 days after period end (following Monday)

## Message Types

### Advance Notice (7 AM CST)
- Sent to general channel
- Brief reminder that pay period ends today

### Main Reminders (8:30 AM CST)
- Sent to dev and design channels
- Detailed reminder with period dates
- Includes extra hours reminder for dev team

## Troubleshooting

### Messages not sending?
1. Check if today is actually a pay period end: `node setup.js`
2. Verify environment variables are set
3. Check cron job status: `node setup.js list`
4. Look at webhook server logs if using webhook approach

### Wrong timezone?
- Times are in CST/CDT
- Cron-job.org uses UTC
- 7 AM CST = 1 PM UTC (during DST)
- 8:30 AM CST = 2:30 PM UTC (during DST)

### Need to force a test?
- Direct approach: Manually trigger from cron-job.org console
- Webhook approach: Add `"force": true` to webhook payload

## Files

- `PayPeriodNoticeBot.js` - Main bot class that generates and sends messages
- `webhook-handler.js` - Handles incoming webhooks and date checking
- `webhook-server.js` - Express server for webhook endpoint
- `setup.js` - CLI tool to set up cron jobs
- `../shared/pay-period-calculator.js` - Shared pay period date logic