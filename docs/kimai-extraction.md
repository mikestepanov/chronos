# Kimai Data Extraction

## Overview

Chronos uses browser-based automation to reliably extract timesheet data from Kimai, avoiding API limitations and ensuring consistent data export.

## Architecture

### Browser-Based Extraction
The system uses Playwright to automate Kimai's web interface:
- Logs in using credentials
- Navigates to timesheet export
- Configures date ranges for pay periods
- Downloads CSV data
- Processes and stores with versioning

### Key Components

1. **`KimaiExporter`** - Browser automation service
   - Handles login and navigation
   - Manages browser lifecycle
   - Extracts CSV data

2. **`TimesheetProcessor`** - Data processing
   - Parses CSV exports
   - Filters by pay period
   - Validates data integrity

3. **`StorageService`** - Versioned storage
   - Deduplicates identical exports
   - Maintains version history
   - Generates metadata

4. **`HoursReportGenerator`** - Compliance reporting
   - Calculates hours vs expected
   - Tracks deviations
   - Generates formatted reports

## Usage

### Extract Latest Pay Period
```bash
# Standard extraction
npm run pull-kimai

# Show browser (for debugging)
PLAYWRIGHT_HEADLESS=false npm run pull-kimai

# Force new version (skip deduplication)
npm run pull-kimai --force
```

### Manual Pay Period Analysis
```bash
# Identify pay period from CSV
./scripts/identify-pay-period.js path/to/export.csv

# Generate hours report
./scripts/kimai-hours-report.js path/to/export.csv
```

## Configuration

### Environment Variables
```env
# Required credentials
KIMAI_USERNAME=admin@example.com
KIMAI_PASSWORD=your-password

# Optional browser settings
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT=30000
```

### Pay Period Configuration
In `config/pay-period.json`:
```json
{
  "startDate": "2024-01-01",
  "lengthDays": 14,
  "workDays": 10
}
```

## Data Storage

### Directory Structure
```
kimai-data/
├── 2025-07-08/              # Pay period start date
│   ├── metadata.json        # Version metadata
│   ├── v1.csv              # First version
│   ├── v2.csv              # Updated version (if different)
│   └── hours-report.txt    # Compliance report
```

### Version Metadata
```json
{
  "versions": [{
    "version": 1,
    "extractedAt": "2025-07-24T14:03:12.481Z",
    "checksum": "9dee5b15d586...",
    "metadata": {
      "periodNumber": 20,
      "startDate": "2025-07-08T05:00:00.000Z",
      "endDate": "2025-07-22T04:59:59.999Z",
      "recordCount": 522
    }
  }],
  "latest": 1
}
```

## Testing

### Test Coverage
The system includes comprehensive tests for:
- Concurrent extraction requests
- Queue management and deduplication
- Error handling scenarios
- Version control integration
- Load testing (up to 500 concurrent users)

### Performance Metrics
| Concurrent Users | Response Time | Cache Hit |
|-----------------|---------------|-----------|
| 10              | 10ms         | No        |
| 50              | 0.04ms       | Yes       |
| 100             | 0.00ms       | Yes       |
| 500             | 0.002ms      | Yes       |

### Running Tests
```bash
# All tests
npm test

# Mock tests (no API needed)
npm run test:mock

# Integration tests (needs credentials)
npm run test:integration

# Load tests
npm run test:load
```

## Troubleshooting

### Common Issues

1. **Login Fails**
   - Verify credentials in `.env`
   - Check if Kimai UI has changed
   - Try with `PLAYWRIGHT_HEADLESS=false`

2. **Extraction Times Out**
   - Increase `PLAYWRIGHT_TIMEOUT`
   - Check network connectivity
   - Verify date range isn't too large

3. **Empty CSV**
   - Confirm pay period has data
   - Check user permissions in Kimai
   - Verify date calculations

### Debug Mode
```bash
# Enable debug logging
DEBUG=kimai:* npm run pull-kimai

# Show browser and debug
PLAYWRIGHT_HEADLESS=false DEBUG=kimai:* npm run pull-kimai
```

## Best Practices

1. **Regular Extractions**: Run after pay period ends for accuracy
2. **Version History**: Keep historical versions for auditing
3. **Monitoring**: Set up alerts for extraction failures
4. **Caching**: Leverage 30-second cache for concurrent requests
5. **Error Handling**: Check logs for extraction issues

## Integration with Monday Reminders

The extraction system integrates with the Monday reminder workflow:
1. Reminder checks if data exists for the period
2. If missing, triggers extraction automatically
3. Generates compliance report
4. Sends targeted reminders based on hours

See [Monday Reminders](./monday-reminder.md) for details.