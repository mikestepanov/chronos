#!/usr/bin/env node

/**
 * Monday Reminder Daemon
 * Run this at 8 AM - it stays alive for 1 hour to send both notifications
 */

const MondayReminderBot = require('./monday-reminder');
const PumbleClient = require('../shared/pumble-client');
const { format, addHours } = require('date-fns');
require('dotenv').config();

class MondayReminderDaemon {
  constructor() {
    this.bot = new MondayReminderBot();
    this.pumble = new PumbleClient({
      apiKey: process.env.AGENTSMITH_API_KEY,
      botEmail: process.env.AGENTSMITH_EMAIL,
      botId: process.env.AGENTSMITH_ID
    });
  }

  async run() {
    const startTime = new Date();
    console.log(`[${format(startTime, 'yyyy-MM-dd HH:mm:ss')}] Monday Reminder Daemon started`);

    // Check if today is the last day of a pay period
    if (!this.bot.payPeriodCalc.isLastDayOfPeriod(startTime)) {
      console.log('Today is not the last day of a pay period. Exiting.');
      process.exit(0);
    }

    // Get message content
    const messageContent = this.bot.generateMessage(startTime);
    const sendTime = addHours(startTime, 1);

    // Step 1: Send advance notification immediately
    console.log('Sending advance notification to Mikhail...');
    await this.sendAdvanceNotification(messageContent, sendTime);

    // Step 2: Wait 1 hour
    console.log(`Waiting until ${format(sendTime, 'h:mm a')} to send reminders...`);
    console.log('Process will stay alive for 1 hour.');
    
    setTimeout(async () => {
      console.log(`\n[${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}] Sending reminders to channels`);
      
      // Send to channels
      const channels = ['dev', 'design'];
      for (const channelType of channels) {
        const channelId = this.bot.config.messaging.channels[channelType];
        if (channelId) {
          try {
            await this.pumble.sendMessage(channelId, messageContent.text);
            console.log(`✓ Sent to #${channelType}`);
          } catch (error) {
            console.error(`✗ Failed to send to #${channelType}:`, error.message);
          }
        }
      }
      
      console.log('All reminders sent. Daemon exiting.');
      process.exit(0);
    }, 60 * 60 * 1000); // 1 hour

    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\nDaemon interrupted. Exiting...');
      process.exit(0);
    });
  }

  async sendAdvanceNotification(messageContent, sendTime) {
    const preview = messageContent.text.substring(0, 400) + '...';
    
    const notification = `🔔 **Monday Reminder - 1 Hour Notice**

⏰ **Reminders will be sent at:** ${format(sendTime, 'h:mm a')}
📍 **Target Channels:** #dev, #design
📋 **Type:** Monday Timesheet Reminder

📊 **Pay Period Details:**
• Period: ${messageContent.periodInfo.currentPeriod.number}
• Dates: ${format(messageContent.periodInfo.currentPeriod.startDate, 'M/d')} - ${format(messageContent.periodInfo.currentPeriod.endDate, 'M/d')}
• Payment: ${format(messageContent.periodInfo.currentPeriod.paymentDate, 'MMM d')}

📝 **Message Preview:**
${preview}

_The full reminder will be sent to both channels in 1 hour._`;

    try {
      await this.pumble.sendMessage(
        process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID,
        notification
      );
      console.log('✅ Advance notification sent');
    } catch (error) {
      console.error('Failed to send advance notification:', error.message);
    }
  }
}

// Run the daemon
if (require.main === module) {
  const daemon = new MondayReminderDaemon();
  daemon.run().catch(console.error);
}

module.exports = MondayReminderDaemon;