# Koyeb Deployment Guide

## Quick Deploy for Testing

### 1. Set up Koyeb API Key
```bash
# Add to .env
KOYEB_API_KEY=your-koyeb-api-key
```

### 2. Deploy with Test Cron (5-minute intervals)
```bash
# Deploy to Koyeb
npm run deploy
```

This will:
- Deploy the cron server to Koyeb
- Enable test cron that sends messages every 5 minutes to bot-testing channel
- Provide health check endpoint at `/health`
- Manual trigger endpoints (protected by webhook secret)

### 3. Monitor Deployment
- View logs: https://app.koyeb.com/apps/chronos-bot
- Health check: https://chronos-bot.koyeb.app/health
- Status: https://chronos-bot.koyeb.app/

### 4. Manual Triggers (for testing)
```bash
# Trigger test message
curl -X POST https://chronos-bot.koyeb.app/trigger/test \
  -H "x-webhook-secret: test-secret-123"

# Trigger Monday reminder (test mode)
curl -X POST https://chronos-bot.koyeb.app/trigger/monday \
  -H "x-webhook-secret: test-secret-123"
```

## Production Setup (Every Other Monday)

### 1. Update Environment Variables in Koyeb
```bash
ENABLE_TEST_CRON=false       # Disable 5-minute test
ENABLE_MONDAY_REMINDER=true  # Enable Monday reminders
WEBHOOK_SECRET=your-secure-secret
```

### 2. The Monday Reminder Cron
- Runs every Monday at 7 AM CST (12 PM UTC during DST)
- Only sends on Mondays that are the last day of a pay period
- Sends to dev and design channels

### 3. Environment Variables Needed
```
PUMBLE_API_KEY=your-pumble-api-key
KIMAI_USERNAME=admin@example.com
KIMAI_PASSWORD=your-password
DEV_CHANNEL_ID=66934de10aeebd36fe26f468
DESIGN_CHANNEL_ID=66b6450b791a8769092d6f89
```

## Troubleshooting

### Check Logs
```bash
node koyeb/cli.js logs
```

### Check Status
```bash
node koyeb/cli.js status
```

### Redeploy
```bash
npm run deploy
```

## Testing Timeline
1. Deploy with 5-minute test cron
2. Monitor bot-testing channel for messages
3. Verify messages arrive every 5 minutes
4. Once confirmed, switch to production mode