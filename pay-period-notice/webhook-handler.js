#!/usr/bin/env node

/**
 * Webhook handler for pay-period-notice bot
 * Handles incoming webhooks from cron-job.org and determines if reminders should be sent
 */

const PayPeriodNoticeBot = require('./PayPeriodNoticeBot');
const { format } = require('date-fns');

class PayPeriodWebhookHandler {
  constructor(config = {}) {
    this.bot = new PayPeriodNoticeBot(config);
    this.config = {
      requireAuth: config.requireAuth !== false,
      authToken: config.authToken || process.env.CRON_WEBHOOK_TOKEN,
      ...config
    };
  }

  /**
   * Main webhook handler
   */
  async handleWebhook(payload, headers = {}) {
    // Validate authentication if required
    if (this.config.requireAuth) {
      const token = headers['x-cron-token'] || headers['authorization'];
      if (token !== this.config.authToken) {
        return {
          success: false,
          error: 'Unauthorized',
          status: 401
        };
      }
    }

    const { action, channels, force = false, test_mode = false } = payload;
    
    // Get current status
    const status = this.bot.getStatus();
    
    // Check if we should process (unless forced or in test mode)
    if (!force && !test_mode && !status.isLastDay) {
      return {
        success: true,
        processed: false,
        reason: 'Not the last day of pay period',
        details: {
          currentDate: format(new Date(), 'yyyy-MM-dd'),
          periodEnd: format(status.currentPeriod.endDate, 'yyyy-MM-dd'),
          daysRemaining: status.daysRemaining
        }
      };
    }
    
    // Set test mode on bot if requested
    if (test_mode) {
      this.bot.config.testMode = true;
    }
    
    // Process the action
    try {
      let results;
      switch (action) {
        case 'advance-notice':
          results = await this.bot.sendAdvanceNotice(channels || ['general']);
          break;
          
        case 'main-reminders':
        case 'send-reminders':
          results = await this.bot.sendMainReminders(channels || ['dev', 'design']);
          break;
          
        case 'preview':
          results = this.bot.previewMessages(channels || ['dev', 'design']);
          return {
            success: true,
            action: 'preview',
            previews: results
          };
          
        case 'status':
          return {
            success: true,
            action: 'status',
            status
          };
          
        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
            validActions: ['advance-notice', 'main-reminders', 'preview', 'status']
          };
      }
      
      // Check if all sends were successful
      const allSuccess = results.every(r => r.success);
      const successCount = results.filter(r => r.success).length;
      
      return {
        success: allSuccess,
        processed: true,
        action,
        periodNumber: status.currentPeriod.number,
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: results.length - successCount
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Webhook processing error:', error);
      return {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Express.js middleware
   */
  expressMiddleware() {
    return async (req, res) => {
      const result = await this.handleWebhook(req.body, req.headers);
      
      // Log the result
      console.log(`[${new Date().toISOString()}] Webhook processed:`, {
        action: req.body.action,
        success: result.success,
        processed: result.processed
      });
      
      // Set status code based on result
      const statusCode = result.status || (result.success ? 200 : 500);
      res.status(statusCode).json(result);
    };
  }

  /**
   * Create standalone Express app
   */
  createExpressApp() {
    const express = require('express');
    const app = express();
    
    app.use(express.json());
    
    // Health check
    app.get('/health', (req, res) => {
      const status = this.bot.getStatus();
      res.json({
        healthy: true,
        currentPeriod: status.currentPeriod.number,
        isLastDay: status.isLastDay,
        timestamp: new Date().toISOString()
      });
    });
    
    // Main webhook endpoint
    app.post('/webhook', this.expressMiddleware());
    
    // Preview endpoint (GET for easy browser testing)
    app.get('/preview/:channel?', async (req, res) => {
      const channels = req.params.channel ? [req.params.channel] : ['dev', 'design'];
      const previews = this.bot.previewMessages(channels);
      res.json(previews);
    });
    
    return app;
  }
}

// CLI testing interface
if (require.main === module) {
  const handler = new PayPeriodWebhookHandler({ 
    testMode: true,
    requireAuth: false 
  });
  
  console.log('🧪 Testing Pay Period Webhook Handler\n');
  
  // Test different scenarios
  const testScenarios = [
    {
      name: 'Status Check',
      payload: { action: 'status' }
    },
    {
      name: 'Advance Notice',
      payload: { 
        action: 'advance-notice',
        test_mode: true
      }
    },
    {
      name: 'Main Reminders',
      payload: { 
        action: 'main-reminders',
        channels: ['dev', 'design'],
        test_mode: true
      }
    },
    {
      name: 'Preview Messages',
      payload: { 
        action: 'preview',
        channels: ['dev']
      }
    },
    {
      name: 'Non-pay-period Day',
      payload: { 
        action: 'main-reminders',
        test_mode: false,
        force: false
      }
    }
  ];
  
  (async () => {
    for (const scenario of testScenarios) {
      console.log(`\n📝 ${scenario.name}:`);
      const result = await handler.handleWebhook(scenario.payload);
      console.log(JSON.stringify(result, null, 2));
    }
    
    // Test Express app
    console.log('\n🌐 Express App Example:');
    console.log('const app = handler.createExpressApp();');
    console.log('app.listen(3000, () => console.log("Webhook server running on :3000"));');
  })();
}

module.exports = PayPeriodWebhookHandler;