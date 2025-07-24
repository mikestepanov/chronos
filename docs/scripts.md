# Scripts Reference

## Core Scripts

### pull-kimai

Automated Kimai data extraction for the latest complete pay period.

**Usage:**
```bash
pnpm run pull-kimai

# With options
PLAYWRIGHT_HEADLESS=false pnpm run pull-kimai  # Show browser
PLAYWRIGHT_BROWSER=chromium pnpm run pull-kimai # Use Chrome
PLAYWRIGHT_TIMEOUT=60000 pnpm run pull-kimai   # Increase timeout
```

**What it does:**
1. Determines the most recent complete pay period
2. Launches browser and logs into Kimai
3. Navigates to timesheet page with date filters
4. Exports CSV data
5. Processes and filters entries
6. Generates compliance report
7. Saves versioned data to `kimai-data/`

**Output:**
- CSV file: `kimai-data/YYYY-MM-DD/v1.csv`
- Metadata: `kimai-data/YYYY-MM-DD/metadata.json`
- Report: `kimai-data/YYYY-MM-DD/hours-report.txt`

**Example output:**
```
| User                 | Hours Worked | Expected | Difference | % Deviation | Status |
|---------------------|--------------|----------|------------|-------------|--------|
| Pauline Nguyen      |        85.25 |    80.00 |      +5.25 |       +6.6% | ✗      |
| Raheel Shahzad      |        77.00 |    80.00 |      -3.00 |       -3.8% | ✓      |
```

### send-message

Unified CLI for sending messages via Pumble.

**Usage:**
```bash
# Send to channel
./scripts/send-message.js -c dev -m "Hello team!"

# Send DM
./scripts/send-message.js -u john -m "Please check your timesheet"

# Use template
./scripts/send-message.js -u alice -t timesheet-reminder -s hoursLogged=45 -s hoursExpected=80

# Use preset
./scripts/send-message.js -c general -p weekly-reminder

# Create group DM
./scripts/send-message.js -g alice,bob,charlie -m "Team sync"

# Schedule for later
./scripts/send-message.js -c dev -m "Standup!" --schedule "9am"
./scripts/send-message.js -c dev -m "EOD update" --schedule "5pm"
./scripts/send-message.js -c dev -m "Reminder" --schedule "1h"

# Dry run (preview)
./scripts/send-message.js -c dev -m "Test" --dry-run

# Interactive mode
./scripts/send-message.js interactive
```

**Options:**
- `-c, --channel <name>` - Channel name or ID
- `-u, --user <name>` - Username or ID for DM
- `-g, --group <users>` - Comma-separated users for group DM
- `-m, --message <text>` - Message content
- `-t, --template <name>` - Template name
- `-p, --preset <name>` - Preset name
- `-s, --set <key=value>` - Template variables
- `--schedule <time>` - Schedule time (9am, 1h, 2025-01-20)
- `--dry-run` - Preview without sending
- `-v, --verbose` - Detailed output

**Templates:**
Templates support variables and dynamic content:
```bash
# List available templates
./scripts/send-message.js list

# Use template with variables
./scripts/send-message.js -t timesheet-reminder \
  -s name="John" \
  -s hoursLogged=72 \
  -s hoursExpected=80
```

### identify-pay-period

Analyzes CSV files to determine which pay period(s) they cover.

**Usage:**
```bash
node scripts/identify-pay-period.js ~/Downloads/kimai-export.csv

# With specific date
node scripts/identify-pay-period.js data.csv 2025-01-15
```

**Output:**
```
Analyzing CSV file: ~/Downloads/kimai-export.csv

Date range in file: 2025-01-01 to 2025-01-15
Pay periods found:

Pay Period #20:
  Dates: Dec 24, 2024 - Jan 6, 2025
  Entries: 89 (52.4%)

Pay Period #21:
  Dates: Jan 7, 2025 - Jan 20, 2025
  Entries: 81 (47.6%)

Primary period: #20 (most entries)
```

### kimai-hours-report

Generates compliance report from extracted data.

**Usage:**
```bash
# Generate report for latest data
node scripts/kimai-hours-report.js

# Programmatic usage
const { getMostRecentPayPeriodHoursReport } = require('./scripts/kimai-hours-report');
const result = await getMostRecentPayPeriodHoursReport();
```

**Features:**
- Automatically finds latest extracted data
- Compares actual vs expected hours
- Shows compliance status (✓/✗)
- Calculates deviations
- Saves report to file

## Shell Scripts

### install-playwright.sh
Quick setup for Playwright browsers.

```bash
./scripts/install-playwright.sh
# Installs both Firefox and Chromium
```

### setup.sh
Initial project setup script.

```bash
./scripts/setup.sh
# Installs dependencies, sets up config
```

### kimai-scheduler.sh
Cron-friendly wrapper for scheduled Kimai pulls.

```bash
# Add to crontab:
0 8 * * * /path/to/chronos/scripts/kimai-scheduler.sh
```

### trigger-monday-reminder.sh
Manual trigger for Monday reminders.

```bash
./scripts/trigger-monday-reminder.sh
# Checks if today is pay period end, sends if true
```

## Utility Scripts

### Script Development Guidelines

When creating new scripts:

1. **Make executable:**
   ```bash
   chmod +x scripts/your-script.js
   ```

2. **Add shebang:**
   ```javascript
   #!/usr/bin/env node
   ```

3. **Use commander for CLI:**
   ```javascript
   const { program } = require('commander');
   program
     .option('-v, --verbose', 'verbose output')
     .parse();
   ```

4. **Handle errors gracefully:**
   ```javascript
   try {
     await doWork();
   } catch (error) {
     console.error('Error:', error.message);
     process.exit(1);
   }
   ```

5. **Add to package.json:**
   ```json
   "scripts": {
     "your-script": "node scripts/your-script.js"
   }
   ```

## Environment Variables

Scripts respect these variables:

- `PLAYWRIGHT_BROWSER` - Browser choice (firefox/chromium)
- `PLAYWRIGHT_HEADLESS` - Show/hide browser (true/false)
- `PLAYWRIGHT_TIMEOUT` - Operation timeout in ms
- `NODE_ENV` - Development/production mode
- `DEBUG` - Enable debug logging

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Configuration error
- `3` - Authentication error
- `4` - Network error
- `5` - Data validation error

## Common Patterns

### Running scripts programmatically:
```javascript
const { spawn } = require('child_process');

// Run pull-kimai
const child = spawn('node', ['scripts/pull-kimai.js'], {
  env: { ...process.env, PLAYWRIGHT_HEADLESS: 'true' }
});

child.on('exit', (code) => {
  if (code === 0) console.log('Success!');
});
```

### Handling script output:
```javascript
const { execSync } = require('child_process');

try {
  const output = execSync('node scripts/identify-pay-period.js data.csv', {
    encoding: 'utf8'
  });
  console.log(output);
} catch (error) {
  console.error('Script failed:', error.message);
}
```