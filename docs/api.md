# API Reference

## Overview

Chronos provides serverless API endpoints for webhook integration and external triggers. These endpoints are designed to work with Vercel but can be adapted for other platforms.

## Endpoints

### POST /api/send-reminder

Triggers a pay period reminder to be sent to configured channels.

**Authentication:**
- Optional webhook secret via `x-webhook-secret` header

**Request:**
```bash
curl -X POST https://your-domain/api/send-reminder \
  -H "x-webhook-secret: your-secret-key" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Pay period reminder sent",
  "timestamp": "2025-01-06T12:00:00.000Z"
}
```

**Error Response:**
```json
{
  "error": "Failed to send reminder",
  "message": "Detailed error message"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized (invalid webhook secret)
- `500` - Server error

## Deployment

### Vercel Deployment

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```

3. **Set environment variables:**
   ```bash
   vercel env add WEBHOOK_SECRET
   vercel env add PUMBLE_API_KEY
   vercel env add KIMAI_USERNAME
   vercel env add KIMAI_PASSWORD
   ```

4. **Configure production domain:**
   ```bash
   vercel --prod
   ```

### AWS Lambda Deployment

Adapt the function for AWS Lambda:

```javascript
// api/send-reminder-lambda.js
const KimaiTimesheetBot = require('../kimai-timesheet-bot');

exports.handler = async (event) => {
  // Verify webhook secret
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret && event.headers['x-webhook-secret'] !== webhookSecret) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const bot = new KimaiTimesheetBot();
    await bot.sendPayPeriodReminder();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Pay period reminder sent',
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send reminder',
        message: error.message 
      })
    };
  }
};
```

### Google Cloud Functions

Adapt for Google Cloud:

```javascript
// api/send-reminder-gcf.js
const KimaiTimesheetBot = require('../kimai-timesheet-bot');

exports.sendReminder = async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Headers', 'x-webhook-secret');
    res.status(204).send('');
    return;
  }

  // Verify webhook secret
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret && req.headers['x-webhook-secret'] !== webhookSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const bot = new KimaiTimesheetBot();
    await bot.sendPayPeriodReminder();
    
    res.status(200).json({ 
      success: true, 
      message: 'Pay period reminder sent',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to send reminder',
      message: error.message 
    });
  }
};
```

## Webhook Integration

### GitHub Actions

Trigger reminders from GitHub Actions:

```yaml
name: Send Pay Period Reminder
on:
  schedule:
    - cron: '0 12 * * 1'  # Mondays at noon UTC
  workflow_dispatch:

jobs:
  send-reminder:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Reminder
        run: |
          curl -X POST ${{ secrets.WEBHOOK_URL }} \
            -H "x-webhook-secret: ${{ secrets.WEBHOOK_SECRET }}" \
            -f
```

### Zapier Integration

1. Create a Webhook by Zapier trigger
2. Set method to POST
3. Add header: `x-webhook-secret: your-secret`
4. Use your API endpoint URL

### cron-job.org Integration

1. Create new cron job
2. Set URL to your endpoint
3. Add custom header: `x-webhook-secret: your-secret`
4. Configure schedule

## Security

### Webhook Secret

Always use a webhook secret in production:

1. Generate secure secret:
   ```bash
   openssl rand -hex 32
   ```

2. Set in environment:
   ```bash
   WEBHOOK_SECRET=your-generated-secret
   ```

3. Include in requests:
   ```bash
   curl -H "x-webhook-secret: your-generated-secret" ...
   ```

### Rate Limiting

Implement rate limiting for production:

```javascript
const rateLimit = new Map();

module.exports = async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const now = Date.now();
  const limit = rateLimit.get(ip);
  
  if (limit && now - limit < 60000) { // 1 minute
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  rateLimit.set(ip, now);
  // ... rest of handler
};
```

### CORS Configuration

For browser-based requests:

```javascript
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://your-domain.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'x-webhook-secret');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // ... rest of handler
};
```

## Monitoring

### Health Check Endpoint

Add a health check:

```javascript
// api/health.js
module.exports = async (req, res) => {
  try {
    // Check dependencies
    const pumbleOk = await checkPumbleConnection();
    const kimaiOk = await checkKimaiConnection();
    
    res.status(200).json({
      status: 'healthy',
      services: {
        pumble: pumbleOk,
        kimai: kimaiOk
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
};
```

### Logging

Use structured logging:

```javascript
const log = (level, message, meta = {}) => {
  console.log(JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta
  }));
};

// Usage
log('info', 'Reminder sent', { userId: 'abc123', channel: 'dev' });
```

## Testing

### Local Testing

Test endpoints locally:

```bash
# Start local server
vercel dev

# Test endpoint
curl -X POST http://localhost:3000/api/send-reminder \
  -H "x-webhook-secret: test-secret"
```

### Integration Testing

```javascript
// tests/api.test.js
const request = require('supertest');

describe('API Endpoints', () => {
  test('POST /api/send-reminder requires auth', async () => {
    const response = await request(app)
      .post('/api/send-reminder')
      .expect(401);
    
    expect(response.body.error).toBe('Unauthorized');
  });
  
  test('POST /api/send-reminder sends reminder', async () => {
    const response = await request(app)
      .post('/api/send-reminder')
      .set('x-webhook-secret', process.env.WEBHOOK_SECRET)
      .expect(200);
    
    expect(response.body.success).toBe(true);
  });
});
```

## Future Endpoints

Planned API additions:

### GET /api/hours-report
Get current pay period hours report

### POST /api/compliance-check
Check specific user compliance

### POST /api/schedule-reminder
Schedule a custom reminder

### POST /api/webhook/pumble
Receive Pumble events