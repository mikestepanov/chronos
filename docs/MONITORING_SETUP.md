# Monitoring & Resilience Setup

## How the Scripts Handle Failures

### 1. Retry Logic (Built-in)
```
Attempt 1/3: Pumble API
❌ Attempt 1 failed: Network timeout
⏳ Waiting 5 seconds before retry...
Attempt 2/3: Pumble API  
❌ Attempt 2 failed: 503 Service Unavailable
⏳ Waiting 10 seconds before retry...
Attempt 3/3: Pumble API
✅ Success on attempt 3
```

### 2. Cron Email Alerts
Add MAILTO to your crontab to get emailed on failures:

```bash
# Edit crontab
crontab -e

# Add at the top:
MAILTO=mikhail@starthub.academy

# Your cron jobs:
0 8 * * 1 cd /path/to/omega && node bots/send-advance-notification-resilient.js
0 9 * * 1 cd /path/to/omega && node bots/monday-reminder.js send
```

If a script exits with non-zero status, cron emails you the output.

### 3. Health Check Script
Create a health check that runs after each cron:

```bash
#!/bin/bash
# health-check.sh

LOG_DIR="/home/mstepanov/Documents/GitHub/omega/logs"
FAILURES_DIR="$LOG_DIR/failures"

# Check for recent failures
if [ -n "$(find $FAILURES_DIR -name '*.json' -mtime -1 2>/dev/null)" ]; then
    echo "ALERT: Recent failures detected!"
    # Send urgent notification (SMS, Slack, etc.)
fi

# Check if advance notification was sent today (Mon 8-9 AM)
if [ $(date +%u) -eq 1 ] && [ $(date +%H) -eq 9 ]; then
    if ! grep -q "$(date +%Y-%m-%d).*Success" "$LOG_DIR/advance-notification.log"; then
        echo "WARNING: No advance notification sent today!"
    fi
fi
```

### 4. Systemd Timer (Alternative to Cron)
More robust with built-in restart logic:

```ini
# /etc/systemd/system/monday-reminder-notify.service
[Unit]
Description=Monday Reminder Advance Notification
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=/home/mstepanov/Documents/GitHub/omega
ExecStart=/usr/bin/node bots/send-advance-notification-resilient.js
User=mstepanov
StandardOutput=journal
StandardError=journal

# Retry on failure
Restart=on-failure
RestartSec=300  # Wait 5 minutes between retries
StartLimitBurst=3  # Max 3 retries
StartLimitIntervalSec=3600  # Within 1 hour
```

### 5. Dead Man's Switch
External monitoring that alerts if reminders aren't sent:

```bash
# At end of monday-reminder.js, ping a monitoring service:
curl -fsS --retry 3 https://hc-ping.com/your-uuid-here
```

Services like Healthchecks.io alert you if the ping doesn't arrive.

### 6. Local Fallback Storage
If everything fails, the script writes to:
```
logs/failures/notification-failure-{timestamp}.json
```

You can manually check and send if needed.

## Testing Resilience

Test failure scenarios:
```bash
# Test with no network
sudo iptables -A OUTPUT -d api.pumble.com -j DROP
node bots/send-advance-notification-resilient.js
sudo iptables -D OUTPUT -d api.pumble.com -j DROP

# Test with wrong API key
AGENTSMITH_API_KEY=wrong node bots/send-advance-notification-resilient.js
```

## Summary

With these measures:
1. **Retries** handle temporary failures
2. **Cron emails** alert on script failures  
3. **Logs** track what happened
4. **Fallback files** ensure nothing is lost
5. **External monitoring** catches systemic failures

The chance of both scripts failing silently is extremely low!