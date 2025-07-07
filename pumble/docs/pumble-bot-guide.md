# Pumble Bot Development Guide

## Overview

This guide explains how to create a Pumble bot that can send messages on your behalf. Pumble provides an API that allows you to build custom integrations and bots.

## Do You Need a Server?

**Yes**, you typically need a server to run a Pumble bot, but you have several options:

### Server Options:

1. **Cloud Platforms (Recommended for production)**
   - AWS Lambda (serverless, pay-per-use)
   - Google Cloud Functions
   - Vercel/Netlify (for simple bots)
   - Heroku (easy deployment)
   - DigitalOcean/Linode (VPS)

2. **Local Development**
   - Your own computer (for testing)
   - Raspberry Pi (for home hosting)
   - Local Docker container

3. **No-Code/Low-Code Options**
   - Pipedream (has Pumble integration)
   - Zapier/Make (limited bot functionality)
   - n8n (self-hosted automation)

## Pumble API Overview

### Authentication Methods

1. **API Keys** (Simplest method)
   - Generate using `/api-keys generate` command in Pumble
   - Use in header: `{ Api-Key: YOUR-API-KEY }`
   - Can send as yourself or as bot

2. **OAuth 2.0** (For public apps)
   - More complex setup
   - Required for workspace-wide apps

### Key API Endpoints

```bash
# Base URL
https://pumble-api-keys.addons.marketplace.cake.com

# Send a message
POST /sendMessage
{
  "channelId": "CHANNEL_ID",
  "text": "Your message here",
  "asBot": false  # Set to false to send as yourself
}

# Send a reply
POST /sendReply
{
  "channelId": "CHANNEL_ID",
  "messageId": "MESSAGE_ID",
  "text": "Your reply here",
  "asBot": false
}

# List channels
GET /listChannels

# List messages
GET /listMessages?channelId=CHANNEL_ID
```

## Bot Architecture Options

### 1. Simple Script Bot
```javascript
// Runs on schedule or trigger
const axios = require('axios');

async function sendMessage(text, channelId) {
  await axios.post('https://pumble-api-keys.addons.marketplace.cake.com/sendMessage', {
    channelId,
    text,
    asBot: false
  }, {
    headers: { 'Api-Key': process.env.PUMBLE_API_KEY }
  });
}
```

### 2. Webhook-Based Bot
- Responds to external events
- Requires public URL endpoint
- Can use ngrok for local development

### 3. Scheduled Bot
- Runs on cron schedule
- Good for reminders, reports
- Can use GitHub Actions, cron jobs

### 4. Interactive Bot
- Responds to slash commands
- Requires more complex setup
- Needs webhook URL registration

## Deployment Examples

### 1. Vercel Deployment (Serverless)
```javascript
// api/send-message.js
export default async function handler(req, res) {
  // Bot logic here
  res.status(200).json({ success: true });
}
```

### 2. Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "bot.js"]
```

### 3. GitHub Actions (Scheduled)
```yaml
name: Pumble Bot
on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM
jobs:
  send-message:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Send Pumble Message
        run: |
          curl -X POST https://pumble-api-keys.addons.marketplace.cake.com/sendMessage \
            -H "Api-Key: ${{ secrets.PUMBLE_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"channelId": "CHANNEL_ID", "text": "Daily standup reminder!", "asBot": false}'
```

## Security Considerations

1. **API Key Storage**
   - Never commit API keys to git
   - Use environment variables
   - Rotate keys regularly

2. **Rate Limiting**
   - Implement retry logic
   - Add delays between requests
   - Monitor API quotas

3. **Error Handling**
   - Log errors appropriately
   - Implement fallback mechanisms
   - Alert on failures

## Getting Started Steps

1. **Generate API Key**
   - In Pumble, type `/api-keys generate`
   - Save the key securely

2. **Choose Deployment Method**
   - Consider your technical skills
   - Evaluate cost requirements
   - Think about maintenance needs

3. **Start Simple**
   - Begin with a basic message sender
   - Test locally first
   - Add features incrementally

4. **Monitor and Iterate**
   - Track bot usage
   - Gather user feedback
   - Improve based on needs

## Example Use Cases

1. **Daily Standup Reminders**
   - Scheduled messages to team channels
   - Customizable per team

2. **CI/CD Notifications**
   - Build status updates
   - Deployment notifications

3. **Meeting Scheduler**
   - Parse calendar events
   - Send meeting reminders

4. **Task Management**
   - Create tasks from messages
   - Update task status

5. **Analytics Reports**
   - Daily/weekly metrics
   - Performance summaries

## Resources

- [Pumble API Documentation](https://pumble.com/help/integrations/)
- [Pipedream Pumble Integration](https://pipedream.com/apps/pumble)
- [Pumble Apps Guide](https://pumble.com/help/integrations/add-pumble-apps/guide-to-pumble-integrations/)

## Next Steps

1. Decide on your bot's purpose
2. Choose a deployment platform
3. Set up development environment
4. Start with basic message sending
5. Expand functionality as needed