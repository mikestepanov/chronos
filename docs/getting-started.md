# Getting Started

This guide will help you set up and run Chronos for the first time.

## Prerequisites

- Node.js 18+ and pnpm
- Firefox or Chromium browser
- Kimai account with admin access
- Pumble workspace and API key

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/chronos.git
   cd chronos
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Install Playwright browsers:**
   ```bash
   pnpm exec playwright install firefox
   # Optional: pnpm exec playwright install chromium
   ```

## Configuration

1. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

2. **Add required credentials:**
   ```env
   # Pumble API (required)
   PUMBLE_API_KEY=your-pumble-api-key

   # Kimai credentials (required for data extraction)
   KIMAI_USERNAME=admin@example.com
   KIMAI_PASSWORD=your-kimai-password
   ```

3. **Verify configuration files:**
   - `config/app.json` - Check Kimai URL
   - `config/channels.json` - Update channel IDs
   - `config/users/users.json` - Add your team members

## First Run

### 1. Test Kimai Connection
```bash
# Extract latest pay period data
pnpm run pull-kimai

# Or with visible browser
PLAYWRIGHT_HEADLESS=false pnpm run pull-kimai
```

Expected output:
```
📅 Pay Period #20: Dec 24, 2024 - Jan 6, 2025
🌐 Launching Firefox browser...
✅ Successfully exported 150 timesheet entries
📊 Generating hours compliance report...
✅ Data saved to kimai-data/2025-01-06/
```

### 2. Test Messaging
```bash
# Send test message to yourself
./scripts/send-message.js interactive

# Or direct command
./scripts/send-message.js -c dev -m "Test message from Chronos"
```

### 3. Test Reminders
```bash
# Preview what Monday reminder would look like
node monday-reminder/monday-reminder.js preview

# Send test reminder (bypasses date check)
node monday-reminder/monday-reminder.js immediate
```

## Setting Up Automation

### Cron Jobs

Add to your crontab:
```bash
# Open crontab
crontab -e

# Add these lines:
# Pull Kimai data daily at 8 AM
0 8 * * * cd /path/to/chronos && pnpm run pull-kimai

# Monday reminders at 7 AM CST
0 7 * * 1 cd /path/to/chronos && node monday-reminder/monday-reminder.js run

# Follow-up reminders on Fridays at 3 PM
0 15 * * 5 cd /path/to/chronos && node cronjobs/followup-reminder.js
```

### Systemd Service (Optional)

Create `/etc/systemd/system/chronos.service`:
```ini
[Unit]
Description=Chronos Timesheet Bot
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/chronos
ExecStart=/usr/bin/node monday-reminder/monday-reminder-daemon.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable chronos
sudo systemctl start chronos
```

## Troubleshooting

### Browser Issues

**Firefox not found:**
```bash
# Install Firefox browser
pnpm exec playwright install firefox

# Or use Chromium
PLAYWRIGHT_BROWSER=chromium pnpm run pull-kimai
```

**Timeout errors:**
```bash
# Increase timeout and show browser
PLAYWRIGHT_HEADLESS=false PLAYWRIGHT_TIMEOUT=60000 pnpm run pull-kimai
```

### Authentication Issues

**Kimai login fails:**
1. Verify credentials in `.env`
2. Check if login page changed
3. Try with visible browser to see issue

**Pumble API errors:**
1. Verify API key is correct
2. Check bot has channel access
3. Test with curl:
   ```bash
   curl -H "Authorization: Bearer $PUMBLE_API_KEY" \
        https://pumble.com/api/v1/users/me
   ```

### Data Issues

**Wrong pay period detected:**
```bash
# Check current period
node -e "
  const calc = require('./shared/pay-period-calculator');
  console.log(new calc().getCurrentPeriodInfo());
"
```

**Missing users in report:**
1. Check `config/users/users.json`
2. Verify Kimai username matches
3. Check user is active

### Message Issues

**Channel not found:**
1. Update `config/channels.json` with correct IDs
2. Try both hyphen and underscore versions
3. Use channel ID directly:
   ```bash
   ./scripts/send-message.js -c C01234567890ABCDEF -m "Test"
   ```

## Next Steps

1. **Customize messages**: Edit `config/message-templates.json`
2. **Add team members**: Update `config/users/users.json`
3. **Set up monitoring**: Use the API endpoints
4. **Configure webhooks**: For external triggers
5. **Read development guide**: For customization

## Getting Help

- Check logs in console output
- Run with `--verbose` flag for details
- See [Development Guide](./development.md) for debugging
- Open an issue on GitHub