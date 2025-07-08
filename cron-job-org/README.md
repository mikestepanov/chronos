# CronJobManager

A robust, all-in-one Node.js client for managing cron jobs with [cron-job.org](https://cron-job.org) API.

## Features

- 🚀 Simple, intuitive API
- 🔄 Full CRUD operations for cron jobs
- 🛡️ Built-in validation and error handling
- 🔁 Automatic retry logic for failed requests
- 📊 Job history and execution tracking
- 🧪 Comprehensive test coverage
- 🔐 Support for authenticated webhooks
- 📧 Notification management
- 🌍 Timezone support

## Installation

Since this is part of the chronos repository, just require it directly:

```javascript
// Import individual components
const { CronJobManager, CronValidator, CronBulkManager } = require('./cron-job-org');

// Or import just the manager
const CronJobManager = require('./cron-job-org/CronJobManager');
```

## Quick Start

```javascript
const CronJobManager = require('./cron-job-org/CronJobManager');

// Initialize with your API key
const cronManager = new CronJobManager('your-api-key-here');

// Create a simple cron job
const job = await cronManager.createCronJob({
  job: 'Daily Backup',
  url: 'https://your-app.com/api/backup',
  schedule: '0 2 * * *', // Every day at 2 AM
  timezone: 'America/New_York'
});

// List all jobs
const jobs = await cronManager.listCronJobs();

// Update a job
await cronManager.updateCronJob(job.jobId, {
  schedule: '0 3 * * *' // Change to 3 AM
});

// Delete a job
await cronManager.deleteCronJob(job.jobId);
```

## API Reference

### Constructor

```javascript
new CronJobManager(apiKey, options)
```

- `apiKey` (required) - Your cron-job.org API key
- `options` (optional)
  - `baseURL` - API base URL (default: 'https://api.cron-job.org')
  - `timeout` - Request timeout in ms (default: 30000)
  - `retryAttempts` - Number of retry attempts (default: 3)
  - `retryDelay` - Delay between retries in ms (default: 1000)

### Methods

#### createCronJob(jobConfig)

Creates a new cron job.

```javascript
const job = await cronManager.createCronJob({
  job: 'Job Name',                    // Required
  url: 'https://webhook.url',         // Required
  schedule: '0 9 * * 1',              // Required (cron expression)
  enabled: true,                      // Optional (default: true)
  timezone: 'UTC',                    // Optional (default: 'UTC')
  timeout: 30,                        // Optional (seconds, default: 30)
  method: 'GET',                      // Optional (default: 'GET')
  headers: {                          // Optional
    'X-Custom': 'value'
  },
  body: 'request body',               // Optional (for POST/PUT)
  auth: {                             // Optional
    username: 'user',
    password: 'pass'
  },
  notification: {                     // Optional
    onSuccess: false,
    onFailure: true,
    onDisable: false
  }
});
```

#### listCronJobs(options)

Lists all cron jobs.

```javascript
const jobs = await cronManager.listCronJobs({
  page: 1,    // Optional (default: 1)
  limit: 50   // Optional (default: 50)
});
```

#### getCronJob(jobId)

Gets details of a specific job.

```javascript
const job = await cronManager.getCronJob(12345);
```

#### updateCronJob(jobId, updates)

Updates an existing job.

```javascript
const updated = await cronManager.updateCronJob(12345, {
  title: 'New Title',
  schedule: '0 10 * * *',
  enabled: false
});
```

#### deleteCronJob(jobId)

Deletes a job.

```javascript
const success = await cronManager.deleteCronJob(12345);
```

#### enableCronJob(jobId) / disableCronJob(jobId)

Enable or disable a job.

```javascript
await cronManager.enableCronJob(12345);
await cronManager.disableCronJob(12345);
```

#### getJobHistory(jobId, options)

Gets execution history for a job.

```javascript
const history = await cronManager.getJobHistory(12345, {
  page: 1,
  limit: 50
});
```

#### testCronJob(jobId)

Manually triggers a job for testing.

```javascript
const result = await cronManager.testCronJob(12345);
```

#### getAccountInfo()

Gets account information and limits.

```javascript
const info = await cronManager.getAccountInfo();
```

### Debug Mode

Enable debug mode to see API calls:

```javascript
cronManager.enableDebug();
// ... make API calls ...
cronManager.disableDebug();
```

## Cron Expression Format

Cron expressions follow the standard format:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, 0 and 7 are Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

Examples:
- `0 9 * * 1` - Every Monday at 9:00 AM
- `*/15 * * * *` - Every 15 minutes
- `0 2 * * *` - Every day at 2:00 AM
- `0 0 1 * *` - First day of every month at midnight
- `0 9-17 * * 1-5` - Every weekday, every hour from 9 AM to 5 PM

## Error Handling

The manager provides detailed error messages:

```javascript
try {
  await cronManager.createCronJob({
    job: 'Test',
    url: 'invalid-url',
    schedule: 'invalid'
  });
} catch (error) {
  console.error(error.message);
  // "Invalid URL provided"
  // "Invalid cron expression"
}
```

## Integration Examples

### With GitHub Actions

```javascript
await cronManager.createCronJob({
  job: 'Trigger GitHub Workflow',
  url: 'https://api.github.com/repos/owner/repo/actions/workflows/workflow.yml/dispatches',
  schedule: '0 9 * * 1',
  method: 'POST',
  headers: {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `token ${process.env.GITHUB_TOKEN}`
  },
  body: JSON.stringify({
    ref: 'main',
    inputs: { action: 'scheduled-run' }
  })
});
```

### With Pumble/Slack Webhooks

```javascript
await cronManager.createCronJob({
  job: 'Team Reminder',
  url: process.env.PUMBLE_WEBHOOK_URL,
  schedule: '0 9 * * 1',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Weekly reminder: Please submit your timesheets!'
  })
});
```

## Testing

Run the test suite:

```bash
npm test -- cron-job-org/tests/CronJobManager.test.js
```

## Environment Variables

Add to your `.env`:

```
CRON_JOB_ORG_API_KEY=your-api-key-here
```

## License

Part of the chronos project.