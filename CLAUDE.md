# Claude Development Guidelines

## Kimai Data Extraction

### Identifying Pay Period from CSV Export

To identify which pay period(s) a Kimai CSV export covers:

```bash
node scripts/identify-pay-period.js <csv-file-path>
```

Example output:
```
CSV Date Range: 2025-07-08 to 2025-07-21
Total Entries: 127

Pay Periods Found:

Period #20: 2025-07-08 to 2025-07-22
  Entries: 127 (100.0%)
  Dates: 2025-07-08, 2025-07-09, ... 2025-07-21

Primary Period: #20 with 127 entries
```

This helps you quickly determine:
- Which pay period number the data belongs to
- The date range of entries in the CSV
- If data spans multiple pay periods
- Which period has the most entries (primary period)

### Importing Manual CSV Exports

To import a manually exported Kimai CSV file into the versioned storage system:

```bash
node scripts/import-kimai-csv.js <csv-file-path>
```

This will:
- Identify which pay period the data belongs to
- Import it into the proper `kimai-data/YYYY-MM-DD/` directory
- Create versioned storage with metadata tracking
- Handle duplicate data (won't create new version if data unchanged)

### Generating Hours Report from CSV

To generate an hours compliance report from a CSV file:

```bash
node scripts/generate-hours-report-from-csv.js <csv-file-path>
```

Example output shows compliance status for each user:
- ✓ = Within ±3 hours of expected (compliant)
- ✗ = More than 3 hours deviation (non-compliant)

### Getting Latest Complete Pay Period Data

**Automated Pull** - The recommended approach:

```bash
# One-time setup
pnpm install
pnpm exec playwright install chromium

# Add to .env file:
KIMAI_USERNAME=your_kimai_username
KIMAI_PASSWORD=your_kimai_password

# Pull latest data (or use slash command: /pull-kimai)
pnpm run pull-kimai
```

This will:
1. Automatically determine the most recent complete pay period
2. Log into Kimai using credentials from `.env`
3. Export CSV data via browser automation
4. Save versioned data to `kimai-data/YYYY-MM-DD/` with checksum tracking
5. Generate a compliance report comparing actual vs expected hours

**Manual Export** (if automation fails):

```bash
# Get export instructions
node scripts/kimai-hours-report-v2.js

# Process downloaded CSV
node scripts/kimai-hours-report-v2.js ~/Downloads/kimai-export.csv
```

**Output format:**
```
| User | Hours Worked | Expected | Difference | % Deviation | Status |
|------|--------------|----------|------------|-------------|--------|
| Pauline Nguyen       |        85.25 |    80.00 |      +5.25 |       +6.6% | ✗ |
| Raheel Shahzad       |        77.00 |    80.00 |      -3.00 |       -3.8% | ✓ |
| ...
```

**Compliance Threshold:**
- Status shows ✓ if hours worked are within ±3 hours of expected (not percentage based)
- Status shows ✗ if the difference exceeds 3 hours in either direction

**Data Storage:**
- CSV files are stored in `kimai-data/YYYY-MM-DD/v{N}.csv`
- Metadata with checksums in `kimai-data/YYYY-MM-DD/metadata.json`
- Hours compliance report saved to `kimai-data/YYYY-MM-DD/hours-report.txt`
- Version tracking prevents duplicate extractions

### Programmatic Usage

```javascript
const { getMostRecentPayPeriodHoursReport } = require('./scripts/kimai-hours-report');

const result = await getMostRecentPayPeriodHoursReport();
console.log(result.table);  // Formatted compliance table
console.log(result.files);  // { csv: 'path/to/csv', metadata: 'path/to/metadata.json', report: 'path/to/hours-report.txt' }
```

## Architecture Principles

### Separation of Concerns

When working on this codebase, maintain strict separation of concerns:

```
cronjobs/
  ├── biweekly-reminder.js    # Orchestration only, no business logic
  └── followup-reminder.js     # Uses shared services, no direct API calls

shared/
  ├── timesheet-analyzer.js    # All Kimai API interaction
  ├── pay-period-calculator.js # Date/period calculations
  └── messaging-factory.js     # Pumble API/webhook abstraction

kimai/
  └── (Kimai-specific implementations)
```

**Good Example:**
```javascript
// cronjobs/followup-reminder.js
const TimesheetAnalyzer = require('../shared/timesheet-analyzer');

// Get incomplete users from timesheet analyzer
const incompleteUsers = await this.timesheetAnalyzer.getIncompleteUsers(payPeriod);
```

**Bad Example:**
```javascript
// cronjobs/followup-reminder.js
// DON'T put Kimai logic directly in cronjobs
const response = await fetch(`${this.kimaiUrl}/api/timesheets`);
```

### Key Points
- Cronjobs should only orchestrate, not implement business logic
- All Kimai API interactions belong in `kimai/` or `shared/timesheet-analyzer.js`
- Messaging (whether webhooks or API) is abstracted by `messaging-factory.js`
- This makes it easy to switch between Pumble webhooks/API without changing cronjobs

## Testing

When developing, always test components in isolation:

```bash
# Test cronjobs
node cronjobs/biweekly-reminder.js advance
node cronjobs/followup-reminder.js

# Test shared services directly
node -e "const analyzer = require('./shared/timesheet-analyzer'); analyzer.test()"
```

## Environment Variables

Keep environment variables organized by service:

```env
# Kimai
KIMAI_API_URL=
KIMAI_API_KEY=

# Pumble (use either webhooks OR channel IDs)
PUMBLE_GENERAL_WEBHOOK_URL=
PUMBLE_DEV_WEBHOOK_URL=
# OR
GENERAL_CHANNEL_ID=
DEV_CHANNEL_ID=
```