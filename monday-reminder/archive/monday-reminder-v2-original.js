#!/usr/bin/env node

const ConfigLoader = require('../shared/config-loader');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const SmartScheduler = require('../shared/smart-scheduler');
const { format, setHours, setMinutes, addMinutes } = require('date-fns');

class MondayReminderV2 {
  constructor() {
    this.config = ConfigLoader.load();
    this.scheduler = new SmartScheduler(this.config.messaging.pumble);
    
    this.payPeriodCalc = new PayPeriodCalculator({
      basePeriodNumber: 18,
      basePeriodEndDate: new Date('2025-06-23T12:00:00'),
      periodLengthDays: 14,
      paymentDelayDays: 7
    });
  }

  /**
   * Main entry point - called by cron at 8 AM on Mondays
   */
  async run() {
    const now = new Date();
    console.log(`[${format(now, 'yyyy-MM-dd HH:mm')}] Monday Reminder V2 started`);

    // Check if today is the last day of a pay period
    if (!this.payPeriodCalc.isLastDayOfPeriod(now)) {
      console.log('Today is not the last day of a pay period. Exiting.');
      return;
    }

    // Schedule messages for 9 AM
    const sendTime = setMinutes(setHours(now, 9), 0);
    
    // Get message content
    const messageContent = this.generateMessage(now);
    
    // Schedule for each channel
    const channels = ['dev', 'design'];
    for (const channelType of channels) {
      const channelId = this.config.messaging.channels[channelType];
      if (channelId) {
        await this.scheduler.scheduleMessage({
          channelId,
          message: messageContent.text,
          sendAt: sendTime,
          messageType: 'Monday Timesheet Reminder',
          targetName: `#${channelType}`,
          isResponse: false
        });
        console.log(`✓ Scheduled for #${channelType} at ${format(sendTime, 'h:mm a')}`);
      }
    }

    console.log('\nReminders scheduled successfully!');
  }

  /**
   * Send test reminder immediately
   */
  async sendTestReminder() {
    const now = new Date();
    const messageContent = this.generateMessage(now);
    
    // Send with 5-minute advance notice (as if it's a response)
    const sendTime = addMinutes(now, 6); // 6 minutes from now for testing
    
    await this.scheduler.scheduleMessage({
      channelId: process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID,
      message: messageContent.text,
      sendAt: sendTime,
      messageType: 'Test Monday Reminder',
      targetName: 'Mikhail (DM)',
      isResponse: true // This triggers 5-minute notice instead of 1 hour
    });
    
    console.log('Test reminder scheduled for 6 minutes from now (5-minute advance notice)');
  }

  /**
   * Send immediate reminder (no advance notice)
   */
  async sendImmediateReminder() {
    const messageContent = this.generateMessage(new Date());
    
    const channels = ['dev', 'design'];
    for (const channelType of channels) {
      const channelId = this.config.messaging.channels[channelType];
      if (channelId) {
        try {
          await this.scheduler.sendImmediate(
            channelId,
            messageContent.text,
            'Monday Timesheet Reminder',
            `#${channelType}`
          );
          console.log(`✓ Sent to #${channelType}`);
        } catch (error) {
          console.error(`✗ Failed to send to #${channelType}:`, error.message);
        }
      }
    }
  }

  /**
   * Generate the reminder message
   */
  generateMessage(referenceDate) {
    const periodData = this.payPeriodCalc.generateBotFormattedMessage('agentsmith', { referenceDate });
    const periodInfo = this.payPeriodCalc.getCurrentPeriodInfo(referenceDate);
    
    const message = `**Good Morning Team,**

A Quick Reminder: The ${periodData.periodOrdinal} pay-period is fast approaching!

Please begin to input Kimai data today (${periodData.endDateLong}) end of day. Please note that this paycheck will account for the full 2 weeks. This ${periodData.periodOrdinal} payroll period will include the dates from ${periodData.startDate} – ${periodData.endDate}. (Meaning that today (${periodData.endDateLong}) is also counted for the ${periodData.periodOrdinal} pay-period, TOMORROW (${periodData.tomorrowDate}) is counted for the ${periodData.nextPeriodOrdinal} pay-period.)

For those of you that have been given extra hours, please ensure to input them into Kimai for this pay-period as well.

Please expect the payment to go through on the ${periodData.paymentDate}.

If you have any questions or concerns, please do not hesitate to reach out to Mikhail.

Thank you.

@here`;

    return { text: message, periodInfo };
  }

  /**
   * Preview what message would be sent
   */
  preview(date = new Date()) {
    const messageContent = this.generateMessage(date);
    const periodInfo = messageContent.periodInfo;
    
    console.log('=== MESSAGE PREVIEW ===');
    console.log(messageContent.text);
    console.log('\n=== PERIOD INFO ===');
    console.log(`Current Period: ${periodInfo.currentPeriod.number}`);
    console.log(`Period Dates: ${format(periodInfo.currentPeriod.startDate, 'M/d/yyyy')} - ${format(periodInfo.currentPeriod.endDate, 'M/d/yyyy')}`);
    console.log(`Payment Date: ${format(periodInfo.currentPeriod.paymentDate, 'M/d/yyyy')}`);
    console.log(`Is last day of period: ${this.payPeriodCalc.isLastDayOfPeriod(date)}`);
  }
}

// Command line interface
if (require.main === module) {
  const bot = new MondayReminderV2();
  const command = process.argv[2];

  switch (command) {
    case 'run':
      // Normal operation - schedule for 9 AM
      bot.run().catch(console.error);
      break;

    case 'test':
      // Test with 5-minute notice
      bot.sendTestReminder().catch(console.error);
      break;

    case 'immediate':
      // Send immediately with post-notification
      bot.sendImmediateReminder().catch(console.error);
      break;

    case 'preview':
      // Preview message
      const date = process.argv[3] ? new Date(process.argv[3]) : new Date();
      bot.preview(date);
      break;

    default:
      console.log('Usage: node monday-reminder-v2.js [command]');
      console.log('Commands:');
      console.log('  run       - Schedule for 9 AM (use at 8 AM)');
      console.log('  test      - Test with 5-minute advance notice');
      console.log('  immediate - Send now with post-notification');
      console.log('  preview   - Preview message');
  }
}

module.exports = MondayReminderV2;