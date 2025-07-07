# Kimai Timesheet Extraction System

This system automatically extracts timesheet data from Kimai during pay periods.

## Components

1. **`kimai-extract-timesheets.js`** - Main extraction script
   - Calculates current pay period
   - Waits for configured number of days before extraction
   - Exports data in CSV, JSON, and summary formats

2. **`kimai-scheduler.sh`** - Cron job management script
   - Easy setup/removal of automated extraction
   - Status monitoring and manual runs

3. **`kimai-extract.service/timer`** - Systemd timer alternative
   - More reliable than cron for system restarts
   - Better logging integration

## Setup

### 1. Configure Environment Variables

Add to your `.env` file:

```bash
# Kimai API Configuration
KIMAI_URL=https://kimai.starthub.academy
KIMAI_API_KEY=your_api_key_here
# Or use username/password if API key not available:
KIMAI_USERNAME=your_username
KIMAI_PASSWORD=your_password

# Extraction Configuration
TIMESHEET_OUTPUT_DIR=./timesheets
PAY_PERIOD_DAYS=14
PAY_PERIOD_START=2024-01-01
EXTRACT_AFTER_DAYS=7  # Extract after 7 days into pay period
```

### 2. Install Dependencies

```bash
npm install axios date-fns dotenv
```

### 3. Set Up Automatic Extraction

#### Option A: Using Cron (Simple)

```bash
# Add cron job
./kimai-scheduler.sh add

# Check status
./kimai-scheduler.sh status

# Remove if needed
./kimai-scheduler.sh remove
```

#### Option B: Using Systemd (Recommended for servers)

```bash
# Copy service files
sudo cp kimai-extract.service /etc/systemd/system/
sudo cp kimai-extract.timer /etc/systemd/system/

# Enable and start timer
sudo systemctl daemon-reload
sudo systemctl enable kimai-extract.timer
sudo systemctl start kimai-extract.timer

# Check status
sudo systemctl status kimai-extract.timer
```

## Usage

### Manual Extraction

```bash
# Extract current pay period (if after configured days)
node kimai-extract-timesheets.js

# Force extraction regardless of days elapsed
node kimai-extract-timesheets.js --force

# Extract custom date range
node kimai-extract-timesheets.js --start 2024-01-01 --end 2024-01-14

# Custom output path
node kimai-extract-timesheets.js --output /path/to/output.csv
```

### Using Scheduler Script

```bash
# Run extraction now
./kimai-scheduler.sh run

# Test configuration
./kimai-scheduler.sh test

# View logs
./kimai-scheduler.sh status
```

## Output Files

For each extraction, three files are created:

1. **`timesheets_periodX_YYYYMMDD-YYYYMMDD.csv`** - Raw CSV export from Kimai
2. **`timesheets_periodX_YYYYMMDD-YYYYMMDD.json`** - Detailed JSON data
3. **`timesheets_periodX_YYYYMMDD-YYYYMMDD_summary.txt`** - Human-readable summary

Files are saved to the configured output directory (default: `./timesheets/`).

## Pay Period Calculation

- Pay periods are calculated from the `PAY_PERIOD_START` date
- Each period is `PAY_PERIOD_DAYS` long (default: 14 days)
- Extraction occurs after `EXTRACT_AFTER_DAYS` (default: 7 days)

Example with default settings:
- Period 1: Jan 1-14 (extraction on Jan 8)
- Period 2: Jan 15-28 (extraction on Jan 22)
- Period 3: Jan 29-Feb 11 (extraction on Feb 5)

## Troubleshooting

1. **Authentication Issues**
   - Verify KIMAI_URL is correct
   - Check API key or username/password
   - See KIMAI_API_KEY_GUIDE.md for obtaining API keys

2. **No Extraction Occurring**
   - Check if enough days have elapsed: `node kimai-extract-timesheets.js`
   - Force extraction: `node kimai-extract-timesheets.js --force`
   - Check logs: `tail -f logs/kimai-extract.log`

3. **Cron Not Running**
   - Verify cron service is running: `sudo service cron status`
   - Check cron logs: `grep CRON /var/log/syslog`
   - Ensure node path is correct: `which node`

## Integration with Existing Bots

The extracted data can be used by:
- `kimai-timesheet-bot.js` - For automated Pumble notifications
- Custom analysis scripts
- External reporting tools

## Security Notes

- API keys are stored in `.env` file (not committed to git)
- Output files may contain sensitive data - secure appropriately
- Consider encrypting archived timesheet data