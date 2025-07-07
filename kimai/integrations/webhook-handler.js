const express = require('express');
const PumbleComplianceBot = require('./pumble-compliance-bot');
const PumbleClient = require('../../lib/pumble-client');

/**
 * Webhook handler for Pumble messages
 * Listens for "@bot done" commands
 */
class WebhookHandler {
  constructor(config) {
    this.app = express();
    this.port = config.port || 3000;
    this.bot = null;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.initializeBot(config);
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  async initializeBot(config) {
    const pumbleClient = new PumbleClient({
      apiToken: config.pumbleApiToken,
      workspaceId: config.workspaceId
    });

    this.bot = new PumbleComplianceBot({
      pumbleClient,
      botUserId: config.botUserId,
      botName: config.botName,
      adminUserId: config.adminUserId,
      minHoursPerDay: config.minHoursPerDay,
      expectedDaysPerPeriod: config.expectedDaysPerPeriod
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Pumble webhook endpoint
    this.app.post('/webhook/pumble', async (req, res) => {
      try {
        const { event, data } = req.body;

        // Handle different event types
        if (event === 'message_created' || event === 'message') {
          await this.handleMessage(data);
        }

        res.json({ success: true });
      } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Manual trigger for testing
    this.app.post('/trigger/compliance-check', async (req, res) => {
      try {
        const result = await this.bot.checkTuesdayCompliance();
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  async handleMessage(messageData) {
    // Log incoming message
    console.log(`[${new Date().toISOString()}] Message from ${messageData.userName}: ${messageData.text}`);

    // Pass to bot for processing
    await this.bot.handleMessage({
      userId: messageData.userId,
      text: messageData.text,
      channelId: messageData.channelId,
      timestamp: messageData.timestamp
    });
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Webhook handler listening on port ${this.port}`);
      console.log(`Webhook URL: http://localhost:${this.port}/webhook/pumble`);
      console.log(`Health check: http://localhost:${this.port}/health`);
    });
  }
}

// Start server if run directly
if (require.main === module) {
  require('dotenv').config();

  const handler = new WebhookHandler({
    port: process.env.WEBHOOK_PORT || 3000,
    pumbleApiToken: process.env.PUMBLE_API_TOKEN,
    workspaceId: process.env.PUMBLE_WORKSPACE_ID,
    botUserId: process.env.PUMBLE_BOT_USER_ID,
    botName: process.env.PUMBLE_BOT_NAME || 'timesheet-bot',
    adminUserId: process.env.PUMBLE_ADMIN_USER_ID,
    minHoursPerDay: parseInt(process.env.MIN_HOURS_PER_DAY || '8'),
    expectedDaysPerPeriod: parseInt(process.env.EXPECTED_DAYS_PER_PERIOD || '10')
  });

  handler.start();
}

module.exports = WebhookHandler;