const PayPeriodCalculator = require('../shared/pay-period-calculator');
const { format } = require('date-fns');
const axios = require('axios');

class PayPeriodNoticeBot {
  constructor(config = {}) {
    this.config = {
      webhookUrl: config.webhookUrl || process.env.PUMBLE_WEBHOOK_URL,
      channelConfigs: config.channelConfigs || this._getDefaultChannelConfigs(),
      timezone: config.timezone || 'America/Chicago',
      testMode: config.testMode || false,
      ...config
    };

    this.payPeriodCalc = new PayPeriodCalculator({
      basePeriodNumber: 18,
      basePeriodEndDate: new Date('2025-06-23T12:00:00'),
      periodLengthDays: 14,
      paymentDelayDays: 7
    });
  }

  _getDefaultChannelConfigs() {
    return {
      dev: {
        webhookUrl: process.env.PUMBLE_DEV_WEBHOOK_URL,
        channelName: 'Dev Team',
        includeExtraHours: true,
        mentions: ['@here']
      },
      design: {
        webhookUrl: process.env.PUMBLE_DESIGN_WEBHOOK_URL,
        channelName: 'Design Team',
        includeExtraHours: false,
        mentions: ['@here']
      },
      general: {
        webhookUrl: process.env.PUMBLE_GENERAL_WEBHOOK_URL,
        channelName: 'Team',
        includeExtraHours: true,
        mentions: ['@here']
      }
    };
  }

  /**
   * Send advance notice (7 AM CST on Monday)
   */
  async sendAdvanceNotice(channels = ['general']) {
    const periodInfo = this.payPeriodCalc.getCurrentPeriodInfo();
    const { currentPeriod } = periodInfo;
    
    const message = this._generateAdvanceNoticeMessage(currentPeriod);
    
    const results = [];
    for (const channel of channels) {
      try {
        const result = await this._sendToChannel(channel, message, 'advance-notice');
        results.push({ channel, success: true, ...result });
      } catch (error) {
        results.push({ channel, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Send main reminders (8:30 AM CST on Monday)
   */
  async sendMainReminders(channels = ['dev', 'design']) {
    const periodInfo = this.payPeriodCalc.getCurrentPeriodInfo();
    const { currentPeriod, nextPeriod } = periodInfo;
    
    const results = [];
    for (const channel of channels) {
      try {
        const message = this._generateMainReminderMessage(currentPeriod, nextPeriod, channel);
        const result = await this._sendToChannel(channel, message, 'main-reminder');
        results.push({ channel, success: true, ...result });
      } catch (error) {
        results.push({ channel, success: false, error: error.message });
      }
    }
    
    return results;
  }

  _generateAdvanceNoticeMessage(currentPeriod) {
    const periodOrdinal = this.payPeriodCalc.getOrdinal(currentPeriod.number);
    const endDateFormatted = format(currentPeriod.endDate, 'EEEE, MMMM do');
    
    return {
      text: `🔔 Pay Period Reminder - Advance Notice`,
      attachments: [{
        color: '#36a64f',
        title: `${periodOrdinal} Pay Period Ending Soon`,
        text: `The ${periodOrdinal} pay period will end on ${endDateFormatted}.\n\nPlease start preparing your time entries in Kimai.`,
        fields: [
          {
            title: 'Period',
            value: `${format(currentPeriod.startDate, 'MMM d')} - ${format(currentPeriod.endDate, 'MMM d')}`,
            short: true
          },
          {
            title: 'Payment Date',
            value: format(currentPeriod.paymentDate, 'MMM d, yyyy'),
            short: true
          }
        ],
        footer: 'Pay Period Notice Bot',
        footer_icon: '⏰',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
  }

  _generateMainReminderMessage(currentPeriod, nextPeriod, channel) {
    const channelConfig = this.config.channelConfigs[channel] || {};
    const { channelName, includeExtraHours, mentions = [] } = channelConfig;
    
    const periodOrdinal = this.payPeriodCalc.getOrdinal(currentPeriod.number);
    const todayFormatted = format(currentPeriod.endDate, 'MMMM do');
    const startFormatted = format(currentPeriod.startDate, 'M/d');
    const endFormatted = format(currentPeriod.endDate, 'M/d');
    const paymentDateFormatted = format(currentPeriod.paymentDate, 'MMMM do');
    const tomorrowFormatted = format(nextPeriod.startDate, 'MMMM do');
    const nextPeriodOrdinal = this.payPeriodCalc.getOrdinal(nextPeriod.number);

    let messageText = `Good Morning ${channelName || 'Team'},\n\n`;
    messageText += `A Quick Reminder: The ${periodOrdinal} pay-period is fast approaching!\n\n`;
    messageText += `Please begin to input Kimai data today (${todayFormatted}) end of day. `;
    messageText += `Please note that this paycheck will account for the full 2 weeks. `;
    messageText += `This ${periodOrdinal} payroll period will include the dates from ${startFormatted} – ${endFormatted}. `;
    messageText += `(Meaning that today (${todayFormatted}) is also counted for the ${periodOrdinal} pay-period, `;
    messageText += `TOMORROW (${tomorrowFormatted}) is counted for the ${nextPeriodOrdinal} pay-period.)`;

    if (includeExtraHours) {
      messageText += `\n\nFor those of you that have been given extra hours, please ensure to input them into Kimai for this pay-period as well.`;
    }

    messageText += `\n\nPlease expect the payment to go through on the ${paymentDateFormatted}.\n\n`;
    messageText += `If you have any questions or concerns, please do not hesitate to reach out to Mikhail.\n\n`;
    messageText += `Thank you.`;
    
    if (mentions.length > 0) {
      messageText += `\n\n${mentions.join(' ')}`;
    }

    return {
      text: messageText,
      attachments: [{
        color: '#ff9900',
        fields: [
          {
            title: `📅 ${periodOrdinal} Pay Period`,
            value: `${startFormatted} - ${endFormatted}`,
            short: true
          },
          {
            title: '💰 Payment Date',
            value: paymentDateFormatted,
            short: true
          },
          {
            title: '⏰ Deadline',
            value: `Today (${todayFormatted}) end of day`,
            short: false
          }
        ]
      }]
    };
  }

  async _sendToChannel(channel, message, type) {
    const channelConfig = this.config.channelConfigs[channel];
    if (!channelConfig) {
      throw new Error(`Channel configuration not found for: ${channel}`);
    }

    const webhookUrl = channelConfig.webhookUrl || this.config.webhookUrl;
    if (!webhookUrl) {
      throw new Error(`No webhook URL configured for channel: ${channel}`);
    }

    if (this.config.testMode) {
      console.log(`[TEST MODE] Would send ${type} to ${channel}:`, message);
      return {
        testMode: true,
        type,
        message: message.text.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const response = await axios.post(webhookUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return {
        type,
        status: response.status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error.response) {
        throw new Error(`Webhook failed with status ${error.response.status}: ${error.response.data}`);
      } else if (error.request) {
        throw new Error(`No response from webhook: ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Get status information about the current pay period
   */
  getStatus() {
    const periodInfo = this.payPeriodCalc.getCurrentPeriodInfo();
    const isLastDay = this.payPeriodCalc.isLastDayOfPeriod();
    const daysRemaining = this.payPeriodCalc.getDaysUntilPeriodEnd();
    
    return {
      currentPeriod: periodInfo.currentPeriod,
      nextPeriod: periodInfo.nextPeriod,
      isLastDay,
      daysRemaining,
      shouldSendReminder: isLastDay
    };
  }

  /**
   * Preview messages without sending
   */
  previewMessages(channels = ['dev', 'design']) {
    const periodInfo = this.payPeriodCalc.getCurrentPeriodInfo();
    const { currentPeriod, nextPeriod } = periodInfo;
    
    const previews = {
      advanceNotice: this._generateAdvanceNoticeMessage(currentPeriod),
      mainReminders: {}
    };
    
    for (const channel of channels) {
      previews.mainReminders[channel] = this._generateMainReminderMessage(
        currentPeriod, 
        nextPeriod, 
        channel
      );
    }
    
    return previews;
  }
}

// CLI interface for testing
if (require.main === module) {
  const bot = new PayPeriodNoticeBot({ testMode: true });
  
  console.log('📊 Pay Period Notice Bot - Status\n');
  const status = bot.getStatus();
  console.log('Current Period:', status.currentPeriod.number);
  console.log('Period Dates:', format(status.currentPeriod.startDate, 'MMM d') + ' - ' + format(status.currentPeriod.endDate, 'MMM d'));
  console.log('Is Last Day:', status.isLastDay);
  console.log('Days Remaining:', status.daysRemaining);
  console.log('');
  
  console.log('📧 Message Previews:\n');
  const previews = bot.previewMessages();
  console.log('Advance Notice:', previews.advanceNotice.text);
  console.log('\nMain Reminder (Dev):', previews.mainReminders.dev.text.substring(0, 200) + '...');
}

module.exports = PayPeriodNoticeBot;