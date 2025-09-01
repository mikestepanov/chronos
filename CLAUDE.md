# Claude Development Guidelines

## 📚 Comprehensive Documentation

For detailed documentation on all aspects of the Chronos system, please see the **[docs](./docs)** directory:

- **[Getting Started](./docs/getting-started.md)** - Setup and first steps
- **[Architecture Overview](./docs/architecture.md)** - System design and patterns
- **[Scripts Reference](./docs/scripts.md)** - Available scripts and usage
- **[Configuration Guide](./docs/configuration.md)** - All configuration options
- **[Development Guide](./docs/development.md)** - Contributing and best practices

## Quick Overview

Chronos is a timesheet reminder bot for Pumble that helps teams stay compliant with timesheet submissions. It integrates with Kimai for timesheet data and sends automated reminders via Pumble.

### Key Features

- 🤖 **Browser-based Kimai extraction** - Reliable data export using Playwright
- 📊 **Compliance reporting** - Automatic hours tracking and deviation alerts
- 💬 **Unified messaging** - Single CLI for all communication needs
- 📅 **Smart scheduling** - Automated reminders based on pay periods
- 🔧 **Configuration-driven** - Easy customization without code changes

## Quick Reference

### Deploy to Koyeb

```bash
# Deploy the cron server
npm run deploy
```

### Extract Latest Pay Period Data

```bash
# Pull latest complete pay period with compliance report
npm run pull-kimai

# Show browser during extraction
PLAYWRIGHT_HEADLESS=false npm run pull-kimai
```

### Send Messages

```bash
# Quick message to channel
./scripts/send-message.js -c dev -m "Hello team!"

# Use template
./scripts/send-message.js -t timesheet-reminder -s name=John -s hours=75

# Interactive mode
./scripts/send-message.js interactive
```

### Key Architecture Principles

1. **Scripts orchestrate, services implement** - Scripts in `/scripts` coordinate but don't contain business logic
2. **Configuration-driven** - All settings in JSON files, only secrets in .env
3. **Platform agnostic** - Messaging abstracted through factories
4. **Separation of concerns** - Clear boundaries between layers

### Environment Variables (Minimal)

```env
# Required credentials
PUMBLE_API_KEY=your-api-key
KIMAI_USERNAME=admin@example.com  
KIMAI_PASSWORD=your-password
KOYEB_API_KEY=your-koyeb-api-key  # For deployments
```

All other configuration is in JSON files under `/config`.

### Koyeb Deployment

The app is deployed on Koyeb with GitHub integration. Changes pushed to the `first` branch auto-deploy.

**Koyeb App Details:**
- **App Name**: `chronos-bot` (permanent)
- **App ID**: `04928f88-b0fc-4984-a209-7b62cbc3b551` (permanent for this app)
- **Service ID**: `cc2ab566-308d-4a6c-bf4b-9e94fb46b683` (may change if service recreated)
- **Service Name**: `web`
- **Region**: `was` (Washington)

**Find IDs Dynamically:**
```bash
# Get App ID by name
APP_ID=$(curl -s -H "Authorization: Bearer $KOYEB_API_KEY" \
  "https://app.koyeb.com/v1/apps" | jq -r '.apps[] | select(.name=="chronos-bot") | .id')

# Get Service ID for the app
SERVICE_ID=$(curl -s -H "Authorization: Bearer $KOYEB_API_KEY" \
  "https://app.koyeb.com/v1/services?app_id='$APP_ID'" | jq -r '.services[0].id')
```

**Current Cron Schedule:**
- **Keep-alive**: Every 10 minutes - sends "Keep-alive check: HH:MM CST" to bot-testing
- **Daily Trivia**: 10 AM CST - sends fun fact/word etymology to bot-testing channel
- **Daily Reminder**: 11:50 AM CST - sends to bot-testing channel
- **Monday Reminder**: 9 AM CST - sends to dev & design (only on pay period end days)

**To Deploy:**

**Method 1 - Manual Deploy (PREFERRED):**
```bash
npm run deploy
# This runs koyeb/deploy.js - interactive deployment script
```

**Method 2 - Auto-deploy via GitHub:**
1. Push changes to GitHub `first` branch
2. Koyeb auto-deploys within a few minutes (usually ~2-3 min)

**After Deployment:**
- Check status at: https://app.koyeb.com/apps/chronos-bot
- Live URL: https://chronos-bot.koyeb.app (Note: web endpoints return 404 but crons still run)

**Check Deployment Status via API:**
```bash
# Check service health
curl -s -H "Authorization: Bearer $KOYEB_API_KEY" \
  "https://app.koyeb.com/v1/services?app_id=04928f88-b0fc-4984-a209-7b62cbc3b551" | jq '.services[0].status'

# Check latest deployment
curl -s -H "Authorization: Bearer $KOYEB_API_KEY" \
  "https://app.koyeb.com/v1/deployments?service_id=cc2ab566-308d-4a6c-bf4b-9e94fb46b683&limit=1" | jq '.deployments[0]'

# Get deployment ID and status
curl -s -H "Authorization: Bearer $KOYEB_API_KEY" \
  "https://app.koyeb.com/v1/deployments?service_id=cc2ab566-308d-4a6c-bf4b-9e94fb46b683&limit=5" | \
  jq '.deployments[] | {id, status, created_at}'
```

**Manual Trigger Endpoints:**
```bash
# Test reminder
curl -X POST https://chronos-bot.koyeb.app/trigger/test \
  -H "x-webhook-secret: test-secret-123"

# Monday reminder (forces send regardless of date)
curl -X POST https://chronos-bot.koyeb.app/trigger/monday \
  -H "x-webhook-secret: test-secret-123"
```

**Important Notes:**
- The health endpoint returns 404 but the cron server still runs properly
- Deployments show as HEALTHY even if web endpoints are not accessible
- Cron jobs continue to execute on schedule regardless of endpoint status
- Use the Koyeb API to verify deployment status, not the web endpoints

## For Detailed Information

Please refer to the comprehensive documentation in the **[docs](./docs)** directory for:
- Complete setup instructions
- All available scripts and options
- Configuration reference
- API documentation
- Development guidelines
- Troubleshooting guides

## Important Guidelines

**NEVER SEND MESSAGES TO DEV OR DESIGN TEAM CHANNELS UNLESS EXPLICITLY SPECIFIED BY THE USER**