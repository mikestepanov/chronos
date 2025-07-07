#!/usr/bin/env node

/**
 * Monday Reminder Scheduler
 * 
 * This script should be run by cron at 8 AM every Monday.
 * It will:
 * 1. Send advance notification to Mikhail at 8 AM
 * 2. Send the actual reminder to channels at 9 AM
 */

const MondayReminderBot = require('./monday-reminder');
const PumbleClient = require('../shared/pumble-client');
const { format, addHours } = require('date-fns');
require('dotenv').config();

class MondayReminderScheduler {
  constructor() {
    this.bot = new MondayReminderBot();
    this.pumble = new PumbleClient({
      apiKey: process.env.AGENTSMITH_API_KEY,
      botEmail: process.env.AGENTSMITH_EMAIL,
      botId: process.env.AGENTSMITH_ID
    });
  }

  async run() {
    const now = new Date();
    console.log(`[${format(now, 'yyyy-MM-dd HH:mm')}] Monday Reminder Scheduler started`);

    // Check if we should send reminders today
    const isLastDay = this.bot.payPeriodCalc.isLastDayOfPeriod(now);
    if (!isLastDay) {
      console.log('Today is not the last day of a pay period. Exiting.');
      return;
    }

    // Get the message preview
    const { message, periodInfo } = this.bot.previewMessage(now);
    
    // Send advance notification to Mikhail
    await this.sendAdvanceNotification(message, periodInfo);
    
    // Schedule the actual reminder for 1 hour later
    console.log('Scheduling actual reminder for 1 hour from now...');
    setTimeout(async () => {
      console.log(`[${format(new Date(), 'yyyy-MM-dd HH:mm')}] Sending Monday reminders to channels`);
      await this.bot.sendMondayReminder();
    }, 60 * 60 * 1000); // 1 hour
    
    // Keep the process alive
    console.log('Scheduler will send reminders in 1 hour. Keeping process alive...');
  }

  async sendAdvanceNotification(messageText, periodInfo) {
    const scheduledTime = addHours(new Date(), 1);
    
    const notification = `🔔 **Monday Reminder - 1 Hour Notice**

⏰ **Reminders will be sent at:** ${format(scheduledTime, 'h:mm a')}
📍 **Target Channels:** #dev, #design
📋 **Type:** Monday Timesheet Reminder

📊 **Pay Period Details:**
• Period: ${periodInfo.currentPeriod.number}
• Dates: ${format(periodInfo.currentPeriod.startDate, 'M/d')} - ${format(periodInfo.currentPeriod.endDate, 'M/d')}
• Payment: ${format(periodInfo.currentPeriod.paymentDate, 'MMM d')}

📝 **Message Preview:**
${messageText.substring(0, 400)}...

_The full reminder will be sent to both channels in 1 hour._`;

    try {
      await this.pumble.sendMessage(
        process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID,
        notification
      );
      console.log('✅ Advance notification sent to Mikhail');
    } catch (error) {
      console.error('Failed to send advance notification:', error.message);
    }
  }
}

// Command line interface
if (require.main === module) {
  const scheduler = new MondayReminderScheduler();
  const command = process.argv[2];

  switch (command) {
    case 'test':
      // Test mode - send notification immediately and reminder after 1 minute
      console.log('TEST MODE: Sending notification now, reminder in 1 minute');
      scheduler.bot.payPeriodCalc.isLastDayOfPeriod = () => true; // Override for testing
      
      (async () => {
        const { message, periodInfo } = scheduler.bot.previewMessage(new Date());
        await scheduler.sendAdvanceNotification(message, periodInfo);
        
        setTimeout(async () => {
          console.log('TEST: Sending reminder to channels');
          await scheduler.bot.sendMondayReminder({ testMode: true });
        }, 60 * 1000); // 1 minute for testing
      })();
      break;
      
    default:
      // Normal operation
      scheduler.run();
  }
}

module.exports = MondayReminderScheduler;