#!/usr/bin/env node

/**
 * Webhook handler for cron-job.org bi-weekly Monday reminders
 * This handles the logic to only process reminders on the correct weeks
 */

const PayPeriodCalculator = require('../shared/pay-period-calculator');
const { format } = require('date-fns');

class BiweeklyMondayWebhookHandler {
  constructor() {
    this.payPeriodCalc = new PayPeriodCalculator({
      basePeriodNumber: 18,
      basePeriodEndDate: new Date('2025-06-23T12:00:00'),
      periodLengthDays: 14,
      paymentDelayDays: 7
    });
  }

  /**
   * Handle incoming webhook from cron-job.org
   * @param {Object} payload - The webhook payload
   * @returns {Object} Response indicating if action was taken
   */
  async handleWebhook(payload) {
    const { action, type, test_mode } = payload;
    
    // Check if this is a bi-weekly trigger
    if (type !== 'biweekly') {
      return {
        processed: false,
        reason: 'Not a bi-weekly trigger'
      };
    }

    // Check if today is the last day of a pay period
    const today = new Date();
    const isPayPeriodEnd = this.payPeriodCalc.isLastDayOfPeriod(today);
    
    // In test mode, always process
    if (test_mode) {
      console.log('🧪 Test mode - processing regardless of date');
      return await this._processReminder(action, payload, true);
    }
    
    // Only process if it's actually the end of a pay period
    if (!isPayPeriodEnd) {
      const periodInfo = this.payPeriodCalc.getCurrentPeriodInfo();
      return {
        processed: false,
        reason: 'Not a pay period end week',
        details: {
          currentDate: format(today, 'yyyy-MM-dd'),
          periodEnd: format(periodInfo.endDate, 'yyyy-MM-dd'),
          nextPeriodEnd: format(periodInfo.nextPeriodEnd, 'yyyy-MM-dd')
        }
      };
    }
    
    // It's the right week! Process the reminder
    return await this._processReminder(action, payload, false);
  }

  async _processReminder(action, payload, isTest) {
    const periodInfo = this.payPeriodCalc.getCurrentPeriodInfo();
    
    console.log(`📅 Processing ${action} for Period ${periodInfo.periodNumber}`);
    console.log(`   Period: ${format(periodInfo.startDate, 'MMM d')} - ${format(periodInfo.endDate, 'MMM d')}`);
    
    switch (action) {
      case 'advance-notice':
        return await this._sendAdvanceNotice(periodInfo, isTest);
        
      case 'send-reminders':
        return await this._sendMainReminders(periodInfo, payload.channels, isTest);
        
      default:
        return {
          processed: false,
          reason: `Unknown action: ${action}`
        };
    }
  }

  async _sendAdvanceNotice(periodInfo, isTest) {
    // Import the actual Monday reminder bot
    const MondayReminderBot = require('./monday-reminder');
    
    try {
      const bot = new MondayReminderBot();
      const message = bot.generateAdvanceNoticeMessage(periodInfo);
      
      if (isTest) {
        console.log('📧 Would send advance notice:', message);
        return {
          processed: true,
          action: 'advance-notice',
          test: true,
          message: message.substring(0, 100) + '...'
        };
      }
      
      // Send actual advance notice
      await bot.sendAdvanceNotice();
      
      return {
        processed: true,
        action: 'advance-notice',
        period: periodInfo.periodNumber,
        sentAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error sending advance notice:', error);
      return {
        processed: false,
        error: error.message
      };
    }
  }

  async _sendMainReminders(periodInfo, channels, isTest) {
    // Import the actual Monday reminder bot
    const MondayReminderBot = require('./monday-reminder');
    
    try {
      const bot = new MondayReminderBot();
      
      if (isTest) {
        const messages = bot.generateReminderMessages(periodInfo);
        console.log('📧 Would send reminders to channels:', channels);
        console.log('   Sample message:', messages.dev.substring(0, 100) + '...');
        return {
          processed: true,
          action: 'send-reminders',
          test: true,
          channels
        };
      }
      
      // Send actual reminders
      await bot.sendReminders();
      
      return {
        processed: true,
        action: 'send-reminders',
        period: periodInfo.periodNumber,
        channels,
        sentAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error sending reminders:', error);
      return {
        processed: false,
        error: error.message
      };
    }
  }
}

// Express.js webhook endpoint example
function createWebhookEndpoint(app) {
  const handler = new BiweeklyMondayWebhookHandler();
  
  app.post('/webhooks/monday-reminder', async (req, res) => {
    // Verify webhook token
    const token = req.headers['x-cron-token'];
    if (token !== process.env.CRON_WEBHOOK_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      const result = await handler.handleWebhook(req.body);
      
      // Log the result
      console.log('Webhook processed:', result);
      
      // Return appropriate status
      if (result.processed) {
        res.status(200).json(result);
      } else {
        // Still return 200 to prevent cron-job.org from retrying
        res.status(200).json({
          ...result,
          note: 'Webhook received but no action taken'
        });
      }
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}

// CLI test interface
if (require.main === module) {
  const handler = new BiweeklyMondayWebhookHandler();
  
  console.log('🧪 Testing bi-weekly webhook handler...\n');
  
  // Test advance notice
  handler.handleWebhook({
    action: 'advance-notice',
    type: 'biweekly',
    test_mode: true
  }).then(result => {
    console.log('\nAdvance notice result:', result);
    
    // Test main reminders
    return handler.handleWebhook({
      action: 'send-reminders',
      type: 'biweekly',
      channels: ['dev', 'design'],
      test_mode: true
    });
  }).then(result => {
    console.log('\nMain reminders result:', result);
    
    // Test on non-pay-period day
    console.log('\n📅 Testing on non-pay-period day:');
    return handler.handleWebhook({
      action: 'send-reminders',
      type: 'biweekly',
      channels: ['dev', 'design'],
      test_mode: false
    });
  }).then(result => {
    console.log('Result:', result);
  }).catch(error => {
    console.error('Test error:', error);
  });
}

module.exports = {
  BiweeklyMondayWebhookHandler,
  createWebhookEndpoint
};