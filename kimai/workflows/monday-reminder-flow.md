# Monday Reminder + Extraction Flow

## Timeline Example (Pay Period: Jan 1-14)

### Monday, Jan 8 (Day 8 of pay period)
- **9:00 AM**: Monday reminder bot sends Pumble message
  ```
  🔔 Monday Reminder: Please input your hours in Kimai
  Pay Period: Jan 1-14 (Day 8 of 14)
  ```

### Tuesday, Jan 9 (Day 9 - First Extraction)
- **10:00 AM**: First extraction runs automatically
  ```bash
  # Scheduler runs daily, checks if it's time
  node kimai/scheduler.js
  
  # Since day 9 > extractAfterDays (7), it extracts
  # Creates: kimai-data/2024-01-01/v1.csv
  ```
- Bot commits to Git (if enabled):
  ```
  Add timesheet data for period 2024-01-01 (v1)
  - Records: 45
  - Extracted at: 2024-01-09T10:00:00Z
  ```

### Wednesday, Jan 10 (Day 10)
- **10:00 AM**: Extraction runs again
- If data changed → Creates v2.csv
- If no changes → Skips (same checksum)

### Thursday, Jan 11 (Day 11)
- **Afternoon**: Pumble bot notices missing hours
- Sends targeted reminder:
  ```
  ⚠️ Missing hours detected for: John, Sarah
  Please update your timesheets in Kimai
  ```

### Friday, Jan 12 (Day 12 - Re-extraction)
- **10:00 AM**: Automatic extraction
- Creates v3.csv if people added hours
- Bot can compare versions:
  ```bash
  # Compare v1 (Tuesday) with v3 (Friday)
  node kimai/cli.js compare --period 2024-01-01 1 3
  ```

## Implementation

### 1. Set Up Environment
```bash
# .env file
KIMAI_URL=https://kimai.starthub.academy
KIMAI_API_KEY=your_key_here

# Pay period configuration
PAY_PERIOD_START=2024-01-01
PAY_PERIOD_DAYS=14
EXTRACT_AFTER_DAYS=8  # Start extracting day after Monday reminder

# Git storage (optional)
STORAGE_TYPE=git
GIT_AUTO_COMMIT=true
GIT_AUTO_PUSH=true
```

### 2. Schedule Daily Extraction
```bash
# Add cron job (runs every day at 10 AM)
crontab -e
0 10 * * * cd /path/to/omega/scripts/kimai && node scheduler.js

# Or use the setup script
cd kimai
./setup.sh
```

### 3. Integration with Pumble Bot

Update your Monday reminder bot to track when reminders are sent:

```javascript
// In monday-reminder.js or pumble bot
const KimaiExtractionService = require('./kimai');

// After sending Monday reminder
async function onMondayReminder() {
  // Send reminder
  await sendPumbleMessage("Monday reminder: Input hours in Kimai");
  
  // Get current period info
  const service = new KimaiExtractionService();
  const status = await service.getStatus();
  
  console.log(`Reminder sent for period ${status.currentPeriod.id}`);
  console.log(`Extraction will start tomorrow (day ${status.currentPeriod.daysElapsed + 1})`);
}
```

### 4. Check for Updates in Pumble Bot

```javascript
// Function to check if hours were added after reminder
async function checkForUpdates(periodId) {
  const service = new KimaiExtractionService();
  
  // Re-extract and compare
  const { result, changes } = await service.reExtractAndCompare(periodId);
  
  if (changes && changes.hasChanges) {
    console.log(`Updates detected: ${changes.addedRecords.length} new entries`);
    
    // Parse CSV to see who added hours
    const latestCSV = await service.getCSV(periodId, result.metadata.version);
    // ... analyze who updated their hours
  }
  
  return changes;
}
```

### 5. Targeted Follow-up Reminders

```javascript
// Run this Thursday/Friday to check compliance
async function sendTargetedReminders() {
  const service = new KimaiExtractionService();
  const period = service.payPeriod.getCurrentPeriod();
  
  // Get latest data
  const latest = await service.storage.getLatest(period.id);
  const csv = await service.getCSV(period.id, latest.version);
  
  // Analyze who's missing hours
  const missingUsers = analyzeMissingHours(csv);
  
  if (missingUsers.length > 0) {
    await sendPumbleMessage(
      `⚠️ Missing hours for: ${missingUsers.join(', ')}\n` +
      `Please update Kimai before end of pay period`
    );
  }
}
```

## Complete Weekly Schedule

```
Monday 9am:    Pumble reminder sent
Tuesday 10am:  First extraction (v1) - baseline
Wednesday 10am: Check for changes (v2 if updated)
Thursday 3pm:  Analyze data, send targeted reminders
Friday 10am:   Extract again (v3) to capture updates
Saturday:      Final extraction before period ends
```

## Benefits

1. **Automatic Tracking**: No manual extraction needed
2. **Version History**: See exactly when people add hours
3. **Git Integration**: Full audit trail with commits
4. **Targeted Reminders**: Only bother people who haven't complied
5. **Verification**: Can prove updates were made after reminders