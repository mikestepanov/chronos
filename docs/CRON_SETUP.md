# Cron Setup for Monday Reminders

## Recommended Setup

### Option 1: Single Cron Job (RECOMMENDED)
Run at 8 AM every Monday. The script will:
- Send 1-hour advance notice to Mikhail immediately
- Schedule the actual reminders for 9 AM

```bash
# Add to crontab (crontab -e)
0 8 * * 1 cd /home/mstepanov/Documents/GitHub/omega && /usr/bin/node bots/monday-reminder-v2.js run >> logs/monday-reminder.log 2>&1
```

### Option 2: GitHub Actions
Create `.github/workflows/monday-reminder.yml`:

```yaml
name: Monday Reminder
on:
  schedule:
    # Runs at 8 AM EST every Monday (13:00 UTC)
    - cron: '0 13 * * 1'
  workflow_dispatch: # Allow manual trigger

jobs:
  send-reminder:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: node bots/monday-reminder-v2.js run
        env:
          AGENTSMITH_API_KEY: ${{ secrets.AGENTSMITH_API_KEY }}
          # Add other required env vars
```

### Option 3: Two Separate Crons
If you prefer explicit control:

```bash
# 8 AM - Send advance notification
0 8 * * 1 cd /home/mstepanov/Documents/GitHub/omega && /usr/bin/node bots/send-advance-notice.js >> logs/advance-notice.log 2>&1

# 9 AM - Send actual reminders
0 9 * * 1 cd /home/mstepanov/Documents/GitHub/omega && /usr/bin/node bots/monday-reminder.js send >> logs/monday-reminder.log 2>&1
```

## Notification Rules

The Smart Scheduler follows these rules:

| Message Type | Advance Notice | When Used |
|-------------|----------------|-----------|
| Scheduled Channel Messages | 1 hour | Monday reminders to #dev/#design |
| Scheduled DMs | 1 hour | Personal reminders |
| Response Messages | 5 minutes | Quick follow-ups, reactions |
| Immediate Messages | Post-notification | Manual sends, urgent messages |

## Testing

Test the different notification timings:

```bash
# Test with 5-minute notice
node bots/monday-reminder-v2.js test

# Send immediately (post-notification)
node bots/monday-reminder-v2.js immediate

# Preview what would be sent
node bots/monday-reminder-v2.js preview
```

## Logs

Create a logs directory:
```bash
mkdir -p /home/mstepanov/Documents/GitHub/omega/logs
```

Monitor logs:
```bash
tail -f logs/monday-reminder.log
```

## Troubleshooting

1. **Check if cron is running:**
   ```bash
   systemctl status crond  # or 'cron' on Ubuntu
   ```

2. **View cron logs:**
   ```bash
   grep CRON /var/log/syslog
   ```

3. **Test cron environment:**
   ```bash
   * * * * * env > /tmp/cron-env.txt
   ```

4. **Common issues:**
   - Path to node might need to be absolute (`/usr/bin/node`)
   - Environment variables not loaded (source .env in script)
   - Working directory not set (use `cd` in cron)