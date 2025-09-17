# Hosting Platform Research & Decision

## Executive Summary

After evaluating multiple hosting platforms for the Chronos bot, we've migrated from Koyeb to a hybrid approach:
- **GitHub Actions** for scheduled cron jobs (currently active)
- **Fly.io or Cyclic.sh** for future webhook-based features (@mentions)

## Why We Left Koyeb

### The Problem
Koyeb's free tier has a critical limitation: services go to sleep after 1 hour of inactivity, even with keep-alive pings every 10 minutes. This makes it unsuitable for reliable cron jobs and bot operations.

### What We Tried
- Keep-alive messages every 10 minutes
- Multiple cron jobs throughout the day
- Result: Still experienced sleep issues and missed scheduled tasks

## Platform Evaluation

### ❌ Rejected Options

| Platform | Issue | Details |
|----------|-------|---------|
| **Koyeb** | Sleeps after 1 hour | Even with 10-min keep-alive pings |
| **Vercel** | 10-second timeout | Serverless functions too limited for our scripts |
| **Render** | Sleeps after 15 min | Slow cold starts (30+ seconds) |
| **Railway** | Not free | $5/month minimum |
| **Cloudflare Workers** | Not Node.js | Can't run our existing scripts (no fs, child_process) |

### ✅ Selected Solution

#### **Current: GitHub Actions** (Active)
- **Cost:** Free (unlimited for public repos)
- **Reliability:** No sleep issues
- **Use case:** Scheduled cron jobs
- **Limitations:** Not suitable for real-time webhooks

Implemented workflows:
- `keep-alive.yml` - Every 10 minutes
- `daily-trivia.yml` - 10 AM CST
- `daily-reminder.yml` - 11:37 PM CST
- `monday-reminder.yml` - 12 PM CST (pay period ends only)

#### **Future: Fly.io** (When needed for @mentions)
- **Cost:** Free (3 VMs, 256MB RAM each)
- **Reliability:** No sleep, always on
- **Use case:** Real-time webhook handling
- **Benefits:** Real Node.js, existing code works

#### **Alternative: Cyclic.sh** (Also good)
- **Cost:** Free
- **Limits:** 10,000 requests/month (sufficient for 20 people)
- **Use case:** Webhook endpoints
- **Benefits:** Designed for APIs, no sleep

## Migration Timeline

### Phase 1: Cron Jobs (Completed ✅)
- Migrated all scheduled tasks from Koyeb to GitHub Actions
- Deployed December 2024
- Running successfully with no issues

### Phase 2: Webhook Bot (Future)
When we need @mention functionality:
1. Deploy webhook handler to Fly.io or Cyclic.sh
2. Configure Pumble webhooks to point to new endpoint
3. Keep GitHub Actions for scheduled tasks

## Cost Analysis

### Current Setup
- **GitHub Actions:** $0/month (public repo)
- **Total:** $0/month

### Future Setup (with webhooks)
- **GitHub Actions:** $0/month
- **Fly.io or Cyclic.sh:** $0/month
- **Total:** $0/month

### If we scale beyond free tiers
- **Railway:** $5/month (unlimited requests, great DX)
- **Render:** $7/month (no sleep, dedicated instance)

## Technical Requirements

Our bot requires:
- Node.js runtime
- File system access (`fs`)
- Child process execution (`child_process`)
- Environment variables
- NPM packages
- Scheduled execution
- Future: Webhook reception for @mentions

## Decision Rationale

1. **GitHub Actions** is perfect for scheduled tasks - free, reliable, well-integrated
2. **Fly.io/Cyclic.sh** offers true free Node.js hosting for webhooks
3. This hybrid approach gives us the best of both worlds
4. No vendor lock-in - easy to migrate if needs change
5. Zero monthly costs while maintaining reliability

## Implementation Notes

### GitHub Actions Setup
```bash
# Already implemented - see .github/workflows/
```

### Future Fly.io Setup
```bash
fly launch
fly deploy
# Configure secrets
fly secrets set PUMBLE_API_KEY=xxx
```

### Future Cyclic.sh Setup
```bash
npm install -g @cyclic.sh/cli
cyclic deploy
# Set environment variables in dashboard
```

## Monitoring & Maintenance

- GitHub Actions: Monitor at https://github.com/mikestepanov/chronos/actions
- Future webhook service: Will implement health checks
- Uptime monitoring: UptimeRobot (free) if needed

## Conclusion

The migration from Koyeb to GitHub Actions has resolved our reliability issues while maintaining zero costs. When real-time features are needed, Fly.io or Cyclic.sh provide free, reliable Node.js hosting that supports our existing codebase without modifications.