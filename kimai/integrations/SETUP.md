# Kimai Compliance Bot Setup

## Overview

This system combines automatic extraction with user-triggered re-extraction:

1. **Tuesday 10 AM**: Automatic compliance check (finds offenders)
2. **User triggered**: Re-extraction when users say "@bot done"

## Setup Steps

### 1. Environment Configuration

Add to your `.env` file:

```bash
# Kimai Configuration
KIMAI_URL=https://kimai.starthub.academy
KIMAI_API_KEY=your_kimai_api_key

# Pumble Configuration
PUMBLE_API_TOKEN=your_pumble_token
PUMBLE_WORKSPACE_ID=your_workspace_id
PUMBLE_BOT_USER_ID=bot_user_id
PUMBLE_BOT_NAME=timesheet-bot
PUMBLE_ADMIN_USER_ID=your_user_id

# Compliance Settings
MIN_HOURS_PER_DAY=8
EXPECTED_DAYS_PER_PERIOD=10

# Git Storage (recommended)
STORAGE_TYPE=git
GIT_AUTO_COMMIT=true
GIT_AUTO_PUSH=true

# Webhook Settings
WEBHOOK_PORT=3000
```

### 2. Install Dependencies

```bash
cd scripts/kimai
npm install

# Additional dependencies for integrations
npm install express
```

### 3. Set Up Automatic Tuesday Check

Add to crontab:
```bash
# Run every Tuesday at 10 AM
0 10 * * 2 cd /path/to/omega/scripts/kimai/integrations && node tuesday-compliance-check.js >> /path/to/logs/compliance.log 2>&1
```

### 4. Start Webhook Handler

Option A: Direct run
```bash
node kimai/integrations/webhook-handler.js
```

Option B: Using PM2 (recommended)
```bash
npm install -g pm2
pm2 start kimai/integrations/webhook-handler.js --name "kimai-webhook"
pm2 save
pm2 startup
```

Option C: Systemd service
```bash
# Create /etc/systemd/system/kimai-webhook.service
[Unit]
Description=Kimai Compliance Webhook Handler
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/omega/scripts
ExecStart=/usr/bin/node kimai/integrations/webhook-handler.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable kimai-webhook
sudo systemctl start kimai-webhook
```

### 5. Configure Pumble Webhook

In Pumble admin settings:
1. Go to Integrations → Webhooks
2. Add new webhook
3. URL: `https://your-server.com:3000/webhook/pumble`
4. Events: Message Created
5. Save and note the webhook secret

### 6. Test the System

#### Test Automatic Extraction
```bash
# Run compliance check manually
node kimai/integrations/tuesday-compliance-check.js
```

#### Test Webhook
```bash
# Check webhook is running
curl http://localhost:3000/health

# Trigger compliance check via API
curl -X POST http://localhost:3000/trigger/compliance-check
```

## Usage Flow

### For Administrators

1. System runs automatically every Tuesday
2. Monitor compliance via Git commits
3. View logs for issues

### For Users

1. Receive alert in 3-way chat on Tuesday
2. Update hours in Kimai
3. Reply with "@timesheet-bot done"
4. Get instant verification

## Monitoring

### Check Logs
```bash
# Compliance check logs
tail -f logs/compliance.log

# Webhook logs
pm2 logs kimai-webhook

# Git history (if using Git storage)
cd kimai-data && git log --oneline
```

### Check Extraction History
```bash
# View all versions for current period
node kimai/cli.js history

# Compare versions
node kimai/cli.js compare --period 2024-01-01 1 2
```

## Troubleshooting

### Bot doesn't respond to "@bot done"
1. Check webhook is running: `pm2 status`
2. Check Pumble webhook configuration
3. Verify bot name matches in .env

### Extraction fails
1. Test Kimai connection: `node kimai/cli.js test`
2. Check API credentials
3. Verify network connectivity

### Wrong users flagged as offenders
1. Adjust MIN_HOURS_PER_DAY
2. Adjust EXPECTED_DAYS_PER_PERIOD
3. Check CSV parsing logic matches your Kimai format