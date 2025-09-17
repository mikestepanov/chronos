const { format } = require('date-fns');
const GroupDMService = require('./GroupDMService');

/**
 * Follow-up Reminder Service
 * Sends follow-up reminders via group DMs
 * Note: This service only sends reminders when called.
 * All scheduling/timing logic should be handled by the cronjob.
 */
class FollowupReminderService {
  constructor() {
    this.groupDMService = new GroupDMService();
  }

  /**
   * Main entry point - sends follow-ups for provided users
   * @param {Array} users - Users to send follow-ups to
   * @param {Object} payPeriod - Current pay period
   */
  async run(users, payPeriod) {
    if (!users || users.length === 0) {
      console.log('No users to process');
      return { sent: 0, total: 0 };
    }

    const result = await this.sendFollowups(users, payPeriod);
    return result;
  }

  /**
   * Send follow-ups for users via group DMs
   */
  async sendFollowups(users, payPeriod) {
    console.log(`Sending follow-ups to ${users.length} users`);
    let sentCount = 0;
    
    for (const userData of users) {
      try {
        await this.groupDMService.sendTimesheetReminder(userData.user, {
          hours: userData.hours,
          missing: userData.missing,
          period: payPeriod
        });
        console.log(`✅ Sent follow-up to ${userData.user.name}`);
        sentCount++;
      } catch (error) {
        console.error(`❌ Failed to send follow-up to ${userData.user.name}:`, error.message);
      }
    }

    return { sent: sentCount, total: users.length };
  }
}

module.exports = FollowupReminderService;