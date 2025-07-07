# Timesheet Compliance Flow

## Automatic vs Triggered Extractions

### 1. Tuesday Morning - Automatic First Extraction
```
CRON (Tuesday 10 AM)
    ↓
tuesday-compliance-check.js
    ↓
Extracts v1 (baseline)
    ↓
Analyzes missing hours
    ↓
Creates 3-way chats for offenders
    ↓
Sends compliance messages
```

### 2. User Updates - Triggered Re-extraction
```
User updates Kimai
    ↓
User sends: "@bot done"
    ↓
Webhook receives message
    ↓
Bot triggers re-extraction (v2, v3, etc.)
    ↓
Compares with previous version
    ↓
Verifies compliance
    ↓
Responds with result
```

## Implementation Flow

### Step 1: Automatic Tuesday Check (CRON)
```bash
# Crontab entry - runs every Tuesday at 10 AM
0 10 * * 2 cd /path/to/kimai/integrations && node tuesday-compliance-check.js
```

This automatically:
- Extracts current timesheet data (creates v1 if first extraction)
- Finds offenders with missing hours
- Creates 3-way Pumble chats
- Sends compliance alerts

### Step 2: Webhook Listener (Always Running)
```bash
# Run as service or with PM2
node kimai/integrations/webhook-handler.js

# Or with PM2
pm2 start kimai/integrations/webhook-handler.js --name "kimai-webhook"
```

This listens for:
- Messages containing "@bot done"
- Triggers re-extraction on demand
- Verifies user compliance
- Responds in the same chat

## Example Timeline

**Monday 9 AM**: Regular Pumble reminder (existing bot)

**Tuesday 10 AM**: Automatic compliance check
```
Bot: "🚨 Hey John, you're supposed to submit your hours!
      Hours logged: 16.0
      Days logged: 2 of 10
      Missing hours: 64.0
      
      Update Kimai and reply with: @timesheet-bot done"
```

**Tuesday 2 PM**: John updates Kimai and responds
```
John: "@timesheet-bot done"

Bot: "⏳ Let me check your updated hours..."
     [Triggers re-extraction - creates v2]
     
Bot: "✅ Verified!
      Your hours have been updated:
      - Total hours: 80.0 (+64.0)
      - Days logged: 10
      
      Thank you for updating your timesheet! 🎉"
```

**Wednesday 11 AM**: Sarah finally responds
```
Sarah: "@timesheet-bot done"

Bot: "⏳ Let me check your updated hours..."
     [Triggers re-extraction - creates v3]
     
Bot: "⚠️ Still Missing Hours
      Current status:
      - Total hours: 40.0
      - Days logged: 5
      - Still missing: 40.0 hours
      
      Please complete your timesheet and try again."
```

## Key Features

1. **Version Control**: Each extraction creates a new version only if data changed
2. **On-Demand Verification**: Users trigger their own verification
3. **Persistent Chats**: 3-way chats remain until compliance achieved
4. **Audit Trail**: Git commits track all extractions with timestamps
5. **No Polling**: Efficient - only extracts when needed