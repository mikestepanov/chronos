# Claude Development Guidelines

## Kimai Data Extraction

### Getting Latest Complete Pay Period Data

To extract the latest complete pay period from Kimai with hours compliance report:

```bash
node scripts/kimai-hours-report.js
```

This will:
1. Automatically determine the most recent complete pay period
2. Extract all timesheet data from Kimai
3. Save versioned data to `kimai-data/YYYY-MM-DD/` with checksum tracking
4. Generate a compliance report comparing actual vs expected hours

**Output format:**
```
| User | Hours Worked | Expected | Difference | % of Expected | Status |
|------|--------------|----------|------------|---------------|--------|
| Pauline Nguyen       |        85.25 |    80.00 |      +5.25 |         106.6% | ✅ |
| Raheel Shahzad       |        77.00 |    80.00 |      -3.00 |          96.3% | ✅ |
| ...
```

**Data Storage:**
- CSV files are stored in `kimai-data/YYYY-MM-DD/v{N}.csv`
- Metadata with checksums in `kimai-data/YYYY-MM-DD/metadata.json`
- Version tracking prevents duplicate extractions

### Programmatic Usage

```javascript
const { getMostRecentPayPeriodHoursReport } = require('./scripts/kimai-hours-report');

const result = await getMostRecentPayPeriodHoursReport();
console.log(result.table);  // Formatted compliance table
console.log(result.files);  // { csv: 'path/to/csv', metadata: 'path/to/metadata.json' }
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