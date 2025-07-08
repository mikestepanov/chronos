const { format } = require('date-fns');
const MessagingFactory = require('../../shared/messaging-factory');
const PayPeriodCalculator = require('../../shared/pay-period-calculator');

/**
 * Biweekly Reminder Service
 * Sends pay period reminders to teams
 * Note: This service only sends reminders when called.
 * All scheduling/timing logic should be handled by the cronjob.
 */
class BiweeklyReminderService {
  constructor() {
    this.messaging = MessagingFactory.create('pumble', {
      channelIds: {
        dev: process.env.DEV_CHANNEL_ID,
        design: process.env.DESIGN_CHANNEL_ID
      }
    });
    this.payPeriodCalc = new PayPeriodCalculator();
  }

  /**
   * Main entry point - sends reminders when called
   * @param {string} type - Type of reminder: 'advance' or 'reminder'
   * @param {Object} payPeriod - Optional pay period object. If not provided, uses current pay period
   */
  async run(type = 'advance', payPeriod = null) {
    // If no pay period provided, get current one
    if (!payPeriod) {
      payPeriod = this.payPeriodCalc.getCurrentPayPeriod();
    }
    
    if (type === 'advance') {
      await this.sendAdvanceNotice(payPeriod);
    } else if (type === 'reminder') {
      await this.sendReminders(payPeriod);
    } else {
      throw new Error(`Unknown reminder type: ${type}`);
    }
  }

  /**
   * Send advance notice (7 AM)
   */
  async sendAdvanceNotice(payPeriod) {
    const message = {
      text: `🔔 **Pay Period Ending Soon**\n\n` +
            `The current pay period (${format(payPeriod.start, 'MMM d')} - ${format(payPeriod.end, 'MMM d')}) ` +
            `ends this **${format(payPeriod.end, 'EEEE')}**.\n\n` +
            `Please ensure your timesheet is complete by end of day.`
    };

    const teams = ['dev', 'design'];
    for (const team of teams) {
      await this.messaging.sendToChannel(team, message);
    }
  }

  /**
   * Send reminders to teams (8:30 AM)
   */
  async sendReminders(payPeriod) {
    const teams = ['dev', 'design'];

    for (const team of teams) {
      const message = {
        text: `⏰ **Timesheet Reminder - ${team.toUpperCase()} Team**\n\n` +
              `Today is the last day of the pay period!\n` +
              `(${format(payPeriod.start, 'MMM d')} - ${format(payPeriod.end, 'MMM d')})\n\n` +
              `Please submit your timesheet by EOD today.\n\n` +
              `_Need help? Type @timesheetbot help_`
      };

      await this.messaging.sendToChannel(team, message);
    }
  }
}

module.exports = BiweeklyReminderService;