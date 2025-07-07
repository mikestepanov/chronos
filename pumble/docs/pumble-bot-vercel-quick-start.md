# Pumble Bot on Vercel - Quick Start

## Why Vercel is Perfect
- **Free forever** for personal use
- **Serverless**: No server management
- **Auto-deploy**: Push to GitHub = instant deployment
- **Simple**: Just JavaScript/TypeScript files

## 5-Minute Setup

### 1. Project Structure
```
pumble-bot/
├── api/
│   ├── send-message.js    # Endpoint to send messages
│   └── webhook.js          # Handle incoming webhooks
├── package.json
├── .env.local              # Local development only
└── vercel.json             # Optional config
```

### 2. Basic Message Sender
```javascript
// api/send-message.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { channel, message } = req.body;
  
  try {
    const response = await fetch('https://pumble-api-keys.addons.marketplace.cake.com/sendMessage', {
      method: 'POST',
      headers: {
        'Api-Key': process.env.PUMBLE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channelId: channel || process.env.DEFAULT_CHANNEL,
        text: message,
        asBot: false
      })
    });

    const data = await response.json();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### 3. Webhook Handler (for automations)
```javascript
// api/webhook.js
export default async function handler(req, res) {
  // Example: GitHub webhook
  const { action, repository, sender } = req.body;
  
  if (action === 'opened') {
    await sendPumbleMessage(
      `🚀 New PR opened in ${repository.name} by ${sender.login}`
    );
  }
  
  res.status(200).json({ received: true });
}

async function sendPumbleMessage(text) {
  // Reuse the logic from above
}
```

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variable
vercel env add PUMBLE_API_KEY
```

Or via GitHub:
1. Push code to GitHub
2. Import project on vercel.com
3. Add env variable in dashboard
4. Auto-deploys on every push!

## Use Cases on Vercel

### 1. Slack-like Slash Commands
```javascript
// api/slash-command.js
// POST your-bot.vercel.app/api/slash-command
export default async function handler(req, res) {
  const { command, text } = req.body;
  
  switch(command) {
    case '/reminder':
      // Schedule a reminder
      break;
    case '/poll':
      // Create a poll
      break;
  }
}
```

### 2. Scheduled Messages (with cron-job.org)
- Deploy endpoint on Vercel
- Use free cron-job.org to hit it on schedule
- No GitHub Actions needed!

### 3. Integration Hub
```javascript
// api/integrations/[service].js
// Handles multiple services dynamically
export default async function handler(req, res) {
  const { service } = req.query;
  
  switch(service) {
    case 'github':
      // Handle GitHub webhooks
    case 'jira':
      // Handle Jira webhooks
    case 'calendar':
      // Handle calendar events
  }
}
```

## Environment Variables

In Vercel Dashboard:
```
PUMBLE_API_KEY=your-api-key-here
DEFAULT_CHANNEL=C123456789
WEBHOOK_SECRET=optional-for-security
```

## Security Tips

1. **Validate Webhooks**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return hash === signature;
}
```

2. **Rate Limiting**
```javascript
// Simple in-memory rate limit
const attempts = new Map();

function rateLimit(ip) {
  const count = attempts.get(ip) || 0;
  if (count > 10) return false;
  attempts.set(ip, count + 1);
  setTimeout(() => attempts.delete(ip), 60000);
  return true;
}
```

## Testing Locally

```bash
# Install Vercel CLI
npm i -g vercel

# Run locally
vercel dev

# Test endpoint
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from local!"}'
```

## Common Patterns

### 1. Error Notifications
```javascript
// Catch errors from your main app
try {
  // Your app logic
} catch (error) {
  await notifyPumble(`🚨 Error: ${error.message}`);
}
```

### 2. Daily Reports
```javascript
// Use cron-job.org to hit this daily
export default async function dailyReport(req, res) {
  const stats = await getYourStats();
  await sendPumbleMessage(`📊 Daily Report: ${stats}`);
}
```

### 3. Interactive Forms
```javascript
// Render simple HTML forms that post to Pumble
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.send(`
      <form method="POST">
        <input name="message" required>
        <button>Send to Pumble</button>
      </form>
    `);
  } else {
    // Handle form submission
  }
}
```

## That's It! 🎉

Your Pumble bot is now:
- ✅ Free to run
- ✅ Auto-deploys from GitHub
- ✅ Scales automatically
- ✅ No server management
- ✅ SSL included

Next steps:
1. Clone/create repo
2. Add your API endpoints
3. Deploy to Vercel
4. Start sending messages!