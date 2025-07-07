#!/usr/bin/env node

const ConfigLoader = require('../shared/config-loader');
const MessagingFactory = require('../shared/messaging-factory');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const SmartScheduler = require('../shared/smart-scheduler');
const BotConfig = require('../shared/bot-config');
const { format, addDays, setHours, setMinutes, addMinutes } = require('date-fns');

class MondayReminderBot {
  constructor() {
    this.config = ConfigLoader.load();
    
    // Initialize messaging with factory for multi-platform support
    this.messaging = MessagingFactory.create(
      this.config.messaging.platform,
      this.config.messaging[this.config.messaging.platform],
      { enableNotifications: true }
    );
    
    // Initialize smart scheduler for advance notifications
    this.scheduler = new SmartScheduler(this.config.messaging[this.config.messaging.platform]);
    
    // Initialize pay period calculator
    // Period 18 ends June 23, 2025 (Monday)
    this.payPeriodCalc = new PayPeriodCalculator({
      basePeriodNumber: 18,
      basePeriodEndDate: new Date('2025-06-23T12:00:00'), // Monday at noon
      periodLengthDays: 14,
      paymentDelayDays: 7 // Payment the following Monday
    });
  }

  /**
   * Send Monday reminder with scheduling options
   * @param {Object} options - Configuration options
   * @param {boolean} options.testMode - Skip date validation
   * @param {Date} options.customDate - Use custom date instead of today
   * @param {Array} options.channels - Channels to send to (default: ['dev', 'design'])
   * @param {boolean} options.includeExtraHours - Include extra hours request
   * @param {boolean} options.useScheduler - Use smart scheduler with advance notice
   * @param {number} options.scheduleHour - Hour to schedule for (default: 9)
   */
  async sendMondayReminder(options = {}) {
    const {
      testMode = false,
      customDate = null,
      channels = ['dev', 'design'],
      includeExtraHours = true,
      useScheduler = false,
      scheduleHour = 9
    } = options;

    const referenceDate = customDate || new Date();
    
    // Check if today (Monday) is the last day of a pay period
    const currentPeriodInfo = this.payPeriodCalc.getCurrentPeriodInfo(referenceDate);
    
    if (!testMode) {
      const isLastDay = this.payPeriodCalc.isLastDayOfPeriod(referenceDate);
      if (!isLastDay) {
        console.log(`Today (${format(referenceDate, 'yyyy-MM-dd')}) is not the last day of a pay period. Skipping reminder.`);
        return;
      }
    }

    console.log(`Sending Monday morning reminder for pay period ending TODAY ${format(currentPeriodInfo.currentPeriod.endDate, 'yyyy-MM-dd')}...`);

    try {
      // Generate message
      const messageContent = this.generateMessage(referenceDate, includeExtraHours);
      
      if (useScheduler) {
        // Use smart scheduler for advance notifications
        const sendTime = setMinutes(setHours(referenceDate, scheduleHour), 0);
        
        for (const channelType of channels) {
          const channelId = this.config.messaging.channels[channelType];
          if (channelId) {
            await this.scheduler.scheduleMessage({
              channelId,
              message: messageContent,
              sendAt: sendTime,
              messageType: 'Monday Timesheet Reminder',
              targetName: `#${channelType}`,
              platform: this.config.messaging.platform
            });
          }
        }
      } else {
        // Send immediately using messaging factory
        for (const channelType of channels) {
          const channelId = this.config.messaging.channels[channelType];
          if (channelId) {
            console.log(`\nSending to #${channelType}...`);
            await this.messaging.sendMessage(channelId, messageContent, false);
            console.log(`✓ Sent to #${channelType}`);
          } else {
            console.log(`\n⚠️ No channel ID configured for #${channelType}`);
          }
        }
      }
      
      console.log('\n✅ Monday reminder process completed successfully');
    } catch (error) {
      console.error('❌ Error sending Monday reminder:', error);
      throw error;
    }
  }

  /**
   * Send advance notification to Mikhail (1 hour before main reminders)
   */
  async sendAdvanceNotification() {
    const now = new Date();
    
    // Check if today is the last day of a pay period
    if (!this.payPeriodCalc.isLastDayOfPeriod(now)) {
      console.log('Today is not the last day of a pay period. No notification needed.');
      return;
    }

    const periodInfo = this.payPeriodCalc.getCurrentPeriodInfo(now);
    const notification = `🔔 **Monday Reminder - 1 Hour Notice**

⏰ **Reminders will be sent at:** 9:00 AM
📍 **Target Channels:** #dev, #design
📋 **Type:** Monday Timesheet Reminder

📊 **Pay Period Details:**
• Period: ${periodInfo.currentPeriod.number}
• Dates: ${format(periodInfo.currentPeriod.startDate, 'M/d')} - ${format(periodInfo.currentPeriod.endDate, 'M/d')}
• Payment: ${format(periodInfo.currentPeriod.paymentDate, 'MMM d')}

_This is your 1-hour advance notice._`;

    try {
      // Get Mikhail's user ID from environment
      const mikhailId = process.env.MIKHAIL_PUMBLE_ID || '66908542f1798a06218c1fc5';
      await this.messaging.sendDirectMessage(mikhailId, notification);
      console.log('✅ Advance notification sent to Mikhail');
    } catch (error) {
      console.error('❌ Error sending advance notification:', error);
      throw error;
    }
  }

  /**
   * Generate the reminder message
   */
  generateMessage(referenceDate, includeExtraHours = true) {
    // Use generateReminderMessage which returns the actual message text
    return this.payPeriodCalc.generateReminderMessage({
      teamName: 'Team',
      referenceDate,
      includeExtraHours
    });
  }

  /**
   * Preview message for a specific date
   */
  previewMessage(date) {
    const isLastDay = this.payPeriodCalc.isLastDayOfPeriod(date);
    console.log(`\nDate: ${format(date, 'yyyy-MM-dd EEEE')}`);
    console.log(`Is last day of period: ${isLastDay}`);
    
    if (isLastDay) {
      console.log('\nMessage Preview:');
      console.log('================');
      console.log(this.generateMessage(date));
    }
  }

  /**
   * Show future pay periods
   */
  showFuturePeriods(count = 5) {
    console.log('\nUpcoming Pay Periods:');
    console.log('====================');
    
    const periods = this.payPeriodCalc.getNextPayPeriods(new Date(), count);
    
    periods.forEach(period => {
      const isLastDayMonday = format(period.endDate, 'EEEE') === 'Monday';
      const marker = isLastDayMonday ? ' ← Monday reminder' : '';
      
      console.log(`\nPeriod ${period.number}:`);
      console.log(`  Start: ${format(period.startDate, 'yyyy-MM-dd EEEE')}`);
      console.log(`  End: ${format(period.endDate, 'yyyy-MM-dd EEEE')}${marker}`);
      console.log(`  Payment: ${format(period.paymentDate, 'yyyy-MM-dd EEEE')}`);
    });
  }

  /**
   * Send test reminder with 5-minute advance notice
   */
  async sendTestReminder() {
    const now = new Date();
    const sendTime = addMinutes(now, 5);
    
    console.log(`[${format(now, 'yyyy-MM-dd HH:mm')}] Scheduling test reminder for ${format(sendTime, 'HH:mm')}`);
    
    await this.sendMondayReminder({
      testMode: true,
      useScheduler: true,
      scheduleHour: sendTime.getHours()
    });
  }

  /**
   * Send immediate reminder
   */
  async sendImmediateReminder() {
    await this.sendMondayReminder({
      testMode: true,
      useScheduler: false
    });
  }

  /**
   * Send test message to Mikhail's DM showing what would be sent
   */
  async sendTestPreview() {
    const now = new Date();
    const message = this.generateMessage(now);
    const dmChannelId = process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID;
    
    if (!dmChannelId) {
      throw new Error('BOT_TO_MIKHAIL_DM_CHANNEL_ID not configured');
    }
    
    const previewMessage = `📋 **Monday Reminder Preview**

This is what will be sent to #dev and #design channels:

---

${message}

---

_This is a preview. Actual reminders are sent on Mondays at 7 AM CST._`;

    try {
      await this.messaging.sendMessage(dmChannelId, previewMessage);
      console.log('✅ Preview sent to your DM');
    } catch (error) {
      console.error('❌ Error sending preview:', error);
      throw error;
    }
  }
}

// Command line interface
if (require.main === module) {
  const bot = new MondayReminderBot();
  const command = process.argv[2];
  const dateArg = process.argv[3];

  switch (command) {
    case 'send':
    case 'run':
      // Send actual reminder (only works on last day of period)
      // 'run' uses scheduler, 'send' sends immediately
      bot.sendMondayReminder({ useScheduler: command === 'run' })
        .then(() => console.log('\nReminder process completed'))
        .catch(console.error);
      break;

    case 'test':
      // Test mode with 5-minute advance notice
      bot.sendTestReminder()
        .then(() => console.log('\nTest reminder scheduled'))
        .catch(console.error);
      break;

    case 'immediate':
      // Send immediately (test mode)
      bot.sendImmediateReminder()
        .then(() => console.log('\nImmediate reminder sent'))
        .catch(console.error);
      break;

    case 'advance':
      // Send advance notification to Mikhail
      bot.sendAdvanceNotification()
        .then(() => console.log('\nAdvance notification sent'))
        .catch(console.error);
      break;

    case 'preview':
      // Preview message for a specific date
      const previewDate = dateArg ? new Date(dateArg) : new Date();
      bot.previewMessage(previewDate);
      break;

    case 'schedule':
      // Show upcoming pay periods
      const count = dateArg ? parseInt(dateArg) : 5;
      bot.showFuturePeriods(count);
      break;

    case 'test-preview':
      // Send preview of Monday reminder to Mikhail
      bot.sendTestPreview()
        .then(() => console.log('\nPreview sent to DM'))
        .catch(console.error);
      break;

    default:
      console.log('Monday Reminder Bot - Unified Version');
      console.log('=====================================');
      console.log('Usage: node monday-reminder-unified.js [command] [date]');
      console.log('\nCommands:');
      console.log('  send      - Send reminder immediately (only on last day)');
      console.log('  run       - Schedule reminder with advance notice');
      console.log('  test      - Test with 5-minute advance notice');
      console.log('  immediate - Send test reminder immediately');
      console.log('  advance   - Send 1-hour advance notice to Mikhail');
      console.log('  preview   - Preview message for date (default: today)');
      console.log('  schedule  - Show next N pay periods (default: 5)');
      console.log('  test-preview - Send preview of reminder to your DM');
      console.log('\nExamples:');
      console.log('  node monday-reminder-unified.js send');
      console.log('  node monday-reminder-unified.js run');
      console.log('  node monday-reminder-unified.js advance');
      console.log('  node monday-reminder-unified.js preview 2024-07-07');
      console.log('  node monday-reminder-unified.js schedule 10');
  }
}

module.exports = MondayReminderBot;