# Notification Approaches for Monday Reminders

You're right - a single cron job can't send something now AND an hour later. Here are the correct approaches:

## Approach 1: Daemon Process (Stays Alive)
**Single cron at 8 AM that runs for 1 hour**

```bash
# Cron runs at 8 AM
0 8 * * 1 cd /path/to/omega && node bots/monday-reminder-daemon.js
```

**How it works:**
1. Process starts at 8 AM
2. Sends advance notification immediately
3. Sets a timer for 1 hour
4. Stays alive for 1 hour
5. Sends actual reminders at 9 AM
6. Exits

**Pros:** Simple, single cron entry
**Cons:** Process stays running for 1 hour

## Approach 2: Two Separate Crons (MOST RELIABLE)
**One cron at 8 AM, another at 9 AM**

```bash
# 8 AM - Send advance notification only
0 8 * * 1 cd /path/to/omega && node bots/send-advance-notification.js

# 9 AM - Send actual reminders
0 9 * * 1 cd /path/to/omega && node bots/monday-reminder.js send
```

**How it works:**
1. First script runs at 8 AM, sends notification, exits
2. Second script runs at 9 AM, sends reminders, exits

**Pros:** Each process runs and exits cleanly
**Cons:** Need two cron entries

## Approach 3: Systemd Timer (Linux)
**Use systemd timers instead of cron**

Create `/etc/systemd/system/monday-reminder-notify.service`:
```ini
[Unit]
Description=Monday Reminder Advance Notification

[Service]
Type=oneshot
WorkingDirectory=/path/to/omega
ExecStart=/usr/bin/node bots/send-advance-notification.js
User=youruser
```

Create `/etc/systemd/system/monday-reminder-notify.timer`:
```ini
[Unit]
Description=Monday Reminder Notification Timer

[Timer]
OnCalendar=Mon *-*-* 08:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Similar setup for the 9 AM reminder.

**Pros:** More control, better logging
**Cons:** More complex setup

## Approach 4: Task Queue (Advanced)
**Use a task queue like Bull/BullMQ**

```javascript
// At 8 AM, schedule both jobs
queue.add('advance-notification', data, { delay: 0 });
queue.add('send-reminders', data, { delay: 60 * 60 * 1000 });
```

**Pros:** Reliable, can handle failures
**Cons:** Requires Redis, more infrastructure

## Recommendation

**For simplicity and reliability: Use Approach 2 (Two Separate Crons)**

It's the most straightforward and doesn't require processes to stay alive or complex infrastructure. Each job does one thing and exits.