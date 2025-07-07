#!/usr/bin/env node

/**
 * Resilient Advance Notification Sender
 * Includes retry logic, fallbacks, and error recovery
 */

const ConfigLoader = require('../shared/config-loader');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const PumbleClient = require('../shared/pumble-client');
const ResilientSender = require('../shared/resilient-sender');
const { format } = require('date-fns');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class ResilientAdvanceNotification {
  constructor() {
    this.config = ConfigLoader.load();
    this.pumble = new PumbleClient(this.config.messaging.pumble);
    this.resilient = new ResilientSender({
      maxRetries: 5,
      retryDelay: 5000,
      backoffMultiplier: 2,
      customDelays: {
        4: 60000,   // 1 minute for 4th retry
        5: 300000   // 5 minutes for 5th retry
      }
    });
    
    this.payPeriodCalc = new PayPeriodCalculator({
      basePeriodNumber: 18,
      basePeriodEndDate: new Date('2025-06-23T12:00:00'),
      periodLengthDays: 14,
      paymentDelayDays: 7
    });
    
    this.logFile = path.join(__dirname, '../logs/advance-notification.log');
  }

  async run() {
    const startTime = new Date();
    await this.log(`Starting advance notification process at ${format(startTime, 'yyyy-MM-dd HH:mm:ss')}`);

    try {
      // Step 1: Check network connectivity
      await this.log('Testing network connectivity...');
      const isConnected = await this.resilient.testConnectivity();
      if (!isConnected) {
        throw new Error('No network connectivity');
      }

      // Step 2: Check if notification needed
      if (!this.payPeriodCalc.isLastDayOfPeriod(startTime)) {
        await this.log('Today is not the last day of a pay period. No notification needed.');
        return { success: true, sent: false, reason: 'Not last day of period' };
      }

      // Step 3: Generate notification
      const notification = this.generateNotification(startTime);
      
      // Step 4: Send with retries
      const primarySender = {
        send: async () => this.pumble.sendMessage(
          process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID,
          notification
        ),
        description: 'Pumble API'
      };

      // Step 5: Add fallback methods (could be email, SMS, etc.)
      const fallbacks = [];
      
      // If we have an admin email configured, use it as fallback
      if (process.env.ADMIN_EMAIL) {
        fallbacks.push({
          send: async () => this.sendEmailFallback(notification),
          description: 'Email fallback'
        });
      }

      // Step 6: Send with all available methods
      await this.resilient.sendCriticalMessage(primarySender, fallbacks);
      
      await this.log('✅ Advance notification sent successfully');
      return { success: true, sent: true };

    } catch (error) {
      await this.log(`❌ CRITICAL ERROR: ${error.message}`);
      
      // Step 7: Last resort - write to local file for manual recovery
      await this.writeFailureFile(notification, error);
      
      throw error;
    }
  }

  generateNotification(date) {
    const periodData = this.payPeriodCalc.generateBotFormattedMessage('agentsmith', { referenceDate: date });
    const periodInfo = this.payPeriodCalc.getCurrentPeriodInfo(date);
    
    return `🔔 **Monday Reminder - 1 Hour Notice**

⏰ **Reminders will be sent at:** 9:00 AM
📍 **Target Channels:** #dev, #design
📋 **Type:** Monday Timesheet Reminder

📊 **Pay Period Details:**
• Period: ${periodInfo.currentPeriod.number}
• Dates: ${format(periodInfo.currentPeriod.startDate, 'M/d')} - ${format(periodInfo.currentPeriod.endDate, 'M/d')}
• Payment: ${format(periodInfo.currentPeriod.paymentDate, 'MMM d')}

📝 **Message Preview:**
Good Morning Team,

A Quick Reminder: The ${periodData.periodOrdinal} pay-period is fast approaching!

Please begin to input Kimai data today (${periodData.endDateLong}) end of day...

_The full reminder will be sent to both channels at 9:00 AM._`;
  }

  async sendEmailFallback(message) {
    // This is a placeholder - implement your email sending logic
    await this.log('Email fallback not implemented yet');
    throw new Error('Email fallback not implemented');
  }

  async writeFailureFile(notification, error) {
    const failureDir = path.join(__dirname, '../logs/failures');
    await fs.mkdir(failureDir, { recursive: true });
    
    const failureFile = path.join(failureDir, `notification-failure-${Date.now()}.json`);
    const failureData = {
      timestamp: new Date().toISOString(),
      error: error.message,
      notification: notification,
      recovery: 'Manual send required at 9 AM'
    };
    
    await fs.writeFile(failureFile, JSON.stringify(failureData, null, 2));
    await this.log(`Failure details written to: ${failureFile}`);
  }

  async log(message) {
    const logMessage = `[${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}] ${message}\n`;
    console.log(message);
    
    try {
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
      await fs.appendFile(this.logFile, logMessage);
    } catch (err) {
      console.error('Failed to write to log file:', err.message);
    }
  }
}

// Run with proper error handling
if (require.main === module) {
  const notifier = new ResilientAdvanceNotification();
  
  notifier.run()
    .then(result => {
      if (result.sent) {
        console.log('Notification sent successfully');
        process.exit(0);
      } else {
        console.log('No notification needed today');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('FAILED TO SEND NOTIFICATION:', error.message);
      // Exit with error code so cron can detect failure
      process.exit(1);
    });
}

module.exports = ResilientAdvanceNotification;