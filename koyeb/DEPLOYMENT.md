# Koyeb Deployment Guide

## Overview

This guide covers deploying the Chronos cron server to Koyeb for automated timesheet reminders.

## Current Cron Jobs

1. **Test Reminder** - Every 10 minutes
   - Sends to `bot-testing` channel
   - Continuous testing of the reminder system

2. **Monday Reminder** - Every Monday at 9 AM CST
   - Sends to `dev` and `design` channels
   - Weekly timesheet reminder

## Deployment Steps

### 1. Set up Koyeb Account

1. Create account at https://app.koyeb.com
2. Get API key from Settings > API

### 2. Configure Environment

Add to your `.env`:
```
KOYEB_API_KEY=your-koyeb-api-key
```

### 3. Deploy via GitHub

1. Connect your GitHub repo in Koyeb dashboard
2. Select branch: `main`
3. Build command: `npm install`
4. Run command: `node koyeb-cron-server.js`
5. Port: 3000
6. Health check path: `/health`

### 4. Required Environment Variables in Koyeb

Add these in the Koyeb dashboard:

```
PUMBLE_API_KEY=your-pumble-api-key
ENABLE_TEST_REMINDER=true
ENABLE_MONDAY_REMINDER=true
WEBHOOK_SECRET=your-secure-secret
NODE_ENV=production
```

## Manual Triggers

Trigger jobs manually for testing:

```bash
# Test reminder (to bot-testing)
curl -X POST https://your-app.koyeb.app/trigger/test \
  -H "x-webhook-secret: your-secret"

# Monday reminder (to dev & design) 
curl -X POST https://your-app.koyeb.app/trigger/monday \
  -H "x-webhook-secret: your-secret"
```

## Monitoring

- Health check: `https://your-app.koyeb.app/health`
- Status page: `https://your-app.koyeb.app/`

## Reminder Schedule Summary

| Reminder | Frequency | Day | Time | Recipients |
|----------|-----------|-----|------|------------|
| Test | Every 10 min | Any | Any | bot-testing |
| Monday | Weekly | Monday | 9 AM CST | dev & design |

## Architecture

The cron server reuses our existing components:
- `PayPeriodCalculator` for pay period logic
- `send-timesheet-reminder.js` for sending reminders
- `channels.json` for channel configuration
- All existing templates and formatting

## Notes

- Test reminder runs every 10 minutes for continuous testing
- Monday reminder sends weekly timesheet reminders
- Manual triggers available for testing both reminders
- All messages use our existing reminder templates