const { format } = require('date-fns');
const MessagingFactory = require('../../shared/messaging-factory');
const PayPeriodCalculator = require('../../shared/pay-period-calculator');
const fs = require('fs');
const path = require('path');

/**
 * Biweekly Reminder Service
 * Sends pay period reminders to teams
 * Note: This service only sends reminders when called.
 * All scheduling/timing logic should be handled by the cronjob.
 */
class BiweeklyReminderService {
  constructor() {
    this.messaging = MessagingFactory.create('pumble',
      { apiKey: process.env.PUMBLE_API_KEY },
      { enableNotifications: false } // Set to true if you want Mikhail notifications
    );
    this.payPeriodCalc = new PayPeriodCalculator();
  }

  /**
   * Main entry point - sends reminders when called
   * @param {string} type - Type of reminder: 'advance' or 'reminder'
   * @param {Array} channelIds - Array of channel IDs to send to
   * @param {Object} payPeriod - Optional pay period object. If not provided, uses current pay period
   */
  async run(type = 'advance', channelIds, payPeriod = null) {
    // If no pay period provided, get current one
    if (!payPeriod) {
      payPeriod = this.payPeriodCalc.getCurrentPayPeriod();
    }
    
    if (type === 'advance') {
      await this.sendAdvanceNotice(payPeriod, channelIds);
    } else if (type === 'reminder') {
      await this.sendReminders(payPeriod, channelIds);
    } else {
      throw new Error(`Unknown reminder type: ${type}`);
    }
  }

  /**
   * Send advance notice (7 AM)
   */
  async sendAdvanceNotice(payPeriod, channelIds) {
    const message = {
      text: `🔔 **Pay Period Ending Soon**\n\n` +
            `The current pay period (${format(payPeriod.start, 'MMM d')} - ${format(payPeriod.end, 'MMM d')}) ` +
            `ends this **${format(payPeriod.end, 'EEEE')}**.\n\n` +
            `Please ensure your timesheet is complete by end of day.`
    };

    for (const channelId of channelIds) {
      await this.messaging.sendToChannelId(channelId, message);
    }
  }

  /**
   * Send reminders to teams (8:30 AM)
   */
  async sendReminders(payPeriod, channelIds) {

    const message = {
      text: `⏰ **Timesheet Reminder**\n\n` +
            `Today is the last day of the pay period!\n` +
            `(${format(payPeriod.start, 'MMM d')} - ${format(payPeriod.end, 'MMM d')})\n\n` +
            `Please submit your timesheet by EOD today.\n\n` +
            `_Need help? Type @timesheetbot help_`
    };

    for (const channelId of channelIds) {
      await this.messaging.sendToChannelId(channelId, message);
    }
  }
}

module.exports = BiweeklyReminderService;