const ConfigLoader = require('../shared/config-loader');
const MessagingFactory = require('../shared/messaging-factory');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const BotConfig = require('../shared/bot-config');
const { format, addDays } = require('date-fns');

class MondayReminderBot {
  constructor() {
    this.config = ConfigLoader.load();
    this.messaging = MessagingFactory.create(
      this.config.messaging.platform,
      this.config.messaging[this.config.messaging.platform],
      { enableNotifications: true }
    );
    
    // Initialize pay period calculator
    // Period 18 ends June 23, 2025 (Monday)
    // Reminders are sent Monday morning when Monday is the last day
    this.payPeriodCalc = new PayPeriodCalculator({
      basePeriodNumber: 18,
      basePeriodEndDate: new Date('2025-06-23T12:00:00'), // Monday at noon
      periodLengthDays: 14,
      paymentDelayDays: 7 // Payment the following Monday
    });
  }

  async sendMondayReminder(options = {}) {
    const {
      testMode = false,
      customDate = null,
      channels = ['dev', 'design'],
      includeExtraHours = true
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
      // Use current period info
      const periodInfo = currentPeriodInfo;
      const periodData = this.payPeriodCalc.generateBotFormattedMessage(this.config.bot.identity, { referenceDate });
      
      // Create original format message
      const messageData = {
        title: `Good Morning Team,`,
        sections: [
          {
            text: `A Quick Reminder: The ${periodData.periodOrdinal} pay-period is fast approaching!`
          },
          {
            text: `Please begin to input Kimai data today (${periodData.endDateLong}) end of day. Please note that this paycheck will account for the full 2 weeks. This ${periodData.periodOrdinal} payroll period will include the dates from ${periodData.startDate} – ${periodData.endDate}. (Meaning that today (${periodData.endDateLong}) is also counted for the ${periodData.periodOrdinal} pay-period, TOMORROW (${periodData.tomorrowDate}) is counted for the ${periodData.nextPeriodOrdinal} pay-period.)`
          }
        ]
      };

      if (includeExtraHours) {
        messageData.sections.push({
          text: `For those of you that have been given extra hours, please ensure to input them into Kimai for this pay-period as well.`
        });
      }

      messageData.sections.push({
        text: `Please expect the payment to go through on the ${periodData.paymentDate}.`
      });

      messageData.sections.push({
        text: `If you have any questions or concerns, please do not hesitate to reach out to Mikhail.\n\nThank you.\n\n@here`
      });

      // Format message for Pumble
      const formattedMessage = this.messaging.formatMessage(messageData.title, messageData.sections);
      const messageText = typeof formattedMessage === 'string' ? formattedMessage : formattedMessage.text || this.formatMessageText(formattedMessage);

      // Send to configured channels
      const sentChannels = [];
      
      for (const channelType of channels) {
        const channelId = this.config.messaging.channels[channelType];
        if (channelId) {
          await this.messaging.sendMessage(channelId, messageText);
          sentChannels.push(channelType);
          console.log(`✓ Sent to ${channelType} channel`);
        }
      }

      // Log period information
      console.log(`\nPay Period Details:`);
      console.log(`- Period Number: ${periodInfo.currentPeriod.number}`);
      console.log(`- Period Dates: ${format(periodInfo.currentPeriod.startDate, 'M/d/yyyy')} - ${format(periodInfo.currentPeriod.endDate, 'M/d/yyyy')}`);
      console.log(`- Payment Date: ${format(periodInfo.currentPeriod.paymentDate, 'M/d/yyyy')}`);
      console.log(`- Next Period: ${periodInfo.nextPeriod.number} starts ${format(periodInfo.nextPeriod.startDate, 'M/d/yyyy')}`);

      if (sentChannels.length === 0) {
        console.warn('Warning: No channels configured for reminders');
      }

      return {
        success: true,
        channelsSent: sentChannels,
        periodInfo
      };

    } catch (error) {
      console.error('Error sending Monday reminder:', error);
      throw error;
    }
  }

  formatMessageText(messageObj) {
    if (messageObj.blocks) {
      // Slack-style formatted message
      return messageObj.text;
    }
    return messageObj;
  }

  // Preview what message would be sent for a given date
  previewMessage(date = new Date()) {
    const periodData = this.payPeriodCalc.generateBotFormattedMessage(this.config.bot.identity, { referenceDate: date });
    const periodInfo = this.payPeriodCalc.getCurrentPeriodInfo(date);
    
    // Create original format message
    const messageData = {
      title: `Good Morning Team,`,
      sections: [
        {
          text: `A Quick Reminder: The ${periodData.periodOrdinal} pay-period is fast approaching!`
        },
        {
          text: `Please begin to input Kimai data today (${periodData.endDateLong}) end of day. Please note that this paycheck will account for the full 2 weeks. This ${periodData.periodOrdinal} payroll period will include the dates from ${periodData.startDate} – ${periodData.endDate}. (Meaning that today (${periodData.endDateLong}) is also counted for the ${periodData.periodOrdinal} pay-period, TOMORROW (${periodData.tomorrowDate}) is counted for the ${periodData.nextPeriodOrdinal} pay-period.)`
        },
        {
          text: `For those of you that have been given extra hours, please ensure to input them into Kimai for this pay-period as well.`
        },
        {
          text: `Please expect the payment to go through on the ${periodData.paymentDate}.`
        },
        {
          text: `If you have any questions or concerns, please do not hesitate to reach out to Mikhail.\n\nThank you.\n\n@here`
        }
      ]
    };

    // Format message
    const formattedMessage = this.messaging.formatMessage(messageData.title, messageData.sections);
    const messageText = typeof formattedMessage === 'string' ? formattedMessage : formattedMessage.text || this.formatMessageText(formattedMessage);
    
    console.log('=== MESSAGE PREVIEW ===');
    console.log(messageText);
    console.log('\n=== PERIOD INFO ===');
    console.log(`Current Period: ${periodInfo.currentPeriod.number}`);
    console.log(`Period Dates: ${format(periodInfo.currentPeriod.startDate, 'M/d/yyyy')} - ${format(periodInfo.currentPeriod.endDate, 'M/d/yyyy')}`);
    console.log(`Payment Date: ${format(periodInfo.currentPeriod.paymentDate, 'M/d/yyyy')}`);
    console.log(`Is last day of period: ${this.payPeriodCalc.isLastDayOfPeriod(date)}`);
    console.log(`Bot Identity: ${this.config.bot.name}`);
    
    return { message: messageText, periodInfo };
  }

  // Calculate future pay periods
  showFuturePeriods(count = 5) {
    console.log('=== UPCOMING PAY PERIODS ===\n');
    
    let currentDate = new Date();
    
    for (let i = 0; i < count; i++) {
      const periodInfo = this.payPeriodCalc.getCurrentPeriodInfo(currentDate);
      const period = periodInfo.currentPeriod;
      
      console.log(`Period ${period.number}:`);
      console.log(`  Dates: ${format(period.startDate, 'MMM d')} - ${format(period.endDate, 'MMM d, yyyy')}`);
      console.log(`  Payment: ${format(period.paymentDate, 'MMM d, yyyy')}`);
      console.log(`  Last day (Monday): ${format(period.endDate, 'EEEE, MMM d')}`);
      console.log('');
      
      // Move to next period
      currentDate = periodInfo.nextPeriod.startDate;
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
      // Send actual reminder (only works on last day of period)
      bot.sendMondayReminder()
        .then(() => console.log('\nReminder sent successfully'))
        .catch(console.error);
      break;

    case 'test':
      // Test mode - sends regardless of date
      bot.sendMondayReminder({ testMode: true })
        .then(() => console.log('\nTest reminder sent successfully'))
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

    default:
      console.log('Usage: node monday-reminder.js [command] [date]');
      console.log('Commands:');
      console.log('  send      - Send reminder (only on last day of period)');
      console.log('  test      - Send test reminder (any day)');
      console.log('  preview   - Preview message for date (default: today)');
      console.log('  schedule  - Show next N pay periods (default: 5)');
      console.log('\nExamples:');
      console.log('  node monday-reminder.js send');
      console.log('  node monday-reminder.js preview 2024-07-07');
      console.log('  node monday-reminder.js schedule 10');
  }
}

module.exports = MondayReminderBot;