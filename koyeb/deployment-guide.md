# Koyeb Deployment Guide

## Quick Start

```bash
# From chronos root directory
npm run deploy
```

## What Gets Deployed

The main `server.js` at the root includes:
- Biweekly reminder cron jobs
- Follow-up reminder cron jobs
- Health check endpoint
- Manual trigger endpoints

## Deployment Flow

1. **Koyeb reads** your GitHub repo
2. **Builds** with `npm install`
3. **Runs** with `npm start` (which runs `server.js`)
4. **Cron jobs** start automatically via node-cron

## URLs

- **Live App**: https://chronos-bot.koyeb.app
- **Health**: https://chronos-bot.koyeb.app/health
- **Dashboard**: https://app.koyeb.com/apps/chronos-bot

## Testing

```bash
# Test biweekly advance notice
curl -X POST https://chronos-bot.koyeb.app/trigger/biweekly-advance

# Test biweekly reminder
curl -X POST https://chronos-bot.koyeb.app/trigger/biweekly-reminder

# Test follow-up
curl -X POST https://chronos-bot.koyeb.app/trigger/followup
```