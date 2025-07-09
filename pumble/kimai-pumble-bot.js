const axios = require('axios');
const csv = require('csv-parse/sync');
const { subDays, format, startOfDay, endOfDay } = require('date-fns');
const KimaiAPI = require('../kimai/services/KimaiAPI');

// Configuration
const config = {
  kimai: {
    baseUrl: process.env.KIMAI_URL || 'https://your-kimai-instance.com',
    apiKey: process.env.KIMAI_API_KEY,
    username: process.env.KIMAI_USERNAME,
    password: process.env.KIMAI_PASSWORD
  },
  pumble: {
    apiKey: process.env.PUMBLE_API_KEY,
    channels: {
      dev: process.env.DEV_CHANNEL_ID,
      design: process.env.DESIGN_CHANNEL_ID
    }
  },
  payPeriod: {
    days: 14, // 2 weeks
    minHoursExpected: 70, // Minimum expected hours per pay period
    reminderDaysBefore: 2 // Send reminder 2 days before period ends
  }
};

// Removed inline KimaiClient - using canonical KimaiAPI from /kimai/services/

// Helper class for Pumble bot functionality
class PumbleTimesheetBot {
  constructor() {
    this.config = config;
    this.kimai = new KimaiAPI(config.kimai);
  }

  async getTimesheets(startDate, endDate) {
    return await this.kimai.getTimesheets(startDate, endDate);
  }

  async exportCSV(startDate, endDate) {
    const csvData = await this.kimai.exportCSV(startDate, endDate);
    return csv.parse(csvData, { columns: true });
  }
}

// Pumble API client
class PumbleClient {
  constructor(config) {
    this.config = config;
    this.baseUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
  }

  async sendMessage(channelId, text) {
    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        channelId,
        text,
        asBot: false
      }, {
        headers: { 'Api-Key': this.config.apiKey }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send Pumble message:', error.message);
      throw error;
    }
  }

  async createGroupChat(userIds, name) {
    try {
      const response = await axios.post(`${this.baseUrl}/createChannel`, {
        name,
        type: 'private',
        members: userIds
      }, {
        headers: { 'Api-Key': this.config.apiKey }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create group chat:', error.message);
      throw error;
    }
  }

  async getUserIdByEmail(email) {
    try {
      const response = await axios.get(`${this.baseUrl}/users`, {
        headers: { 'Api-Key': this.config.apiKey }
      });
      const user = response.data.find(u => u.email === email);
      return user ? user.id : null;
    } catch (error) {
      console.error('Failed to find user:', error.message);
      return null;
    }
  }
}

// Timesheet analyzer
class TimesheetAnalyzer {
  constructor(minHoursExpected) {
    this.minHoursExpected = minHoursExpected;
  }

  analyzeTimesheets(timesheets) {
    const userSummary = {};

    // Group timesheets by user
    timesheets.forEach(entry => {
      const userId = entry.user || entry.User || entry.user_id;
      const hours = parseFloat(entry.duration || entry.Duration || 0) / 3600; // Convert seconds to hours

      if (!userSummary[userId]) {
        userSummary[userId] = {
          userId,
          email: entry.email || entry.Email || '',
          name: entry.username || entry.Username || userId,
          totalHours: 0,
          entries: [],
          issues: []
        };
      }

      userSummary[userId].totalHours += hours;
      userSummary[userId].entries.push({
        date: entry.date || entry.Date,
        hours,
        project: entry.project || entry.Project,
        description: entry.description || entry.Description
      });
    });

    // Analyze each user's submission
    Object.values(userSummary).forEach(user => {
      // Check for missing hours
      if (user.totalHours < this.minHoursExpected) {
        user.issues.push({
          type: 'LOW_HOURS',
          message: `Only ${user.totalHours.toFixed(1)} hours logged (expected minimum: ${this.minHoursExpected})`
        });
      }

      // Check for missing days
      const daysWithEntries = new Set(user.entries.map(e => e.date));
      if (daysWithEntries.size < 10) { // Expecting entries for at least 10 working days
        user.issues.push({
          type: 'MISSING_DAYS',
          message: `Only ${daysWithEntries.size} days with entries`
        });
      }

      // Check for entries without descriptions
      const emptyDescriptions = user.entries.filter(e => !e.description || e.description.trim() === '');
      if (emptyDescriptions.length > 0) {
        user.issues.push({
          type: 'EMPTY_DESCRIPTIONS',
          message: `${emptyDescriptions.length} entries without descriptions`
        });
      }
    });

    return userSummary;
  }
}

// Main bot logic
class KimaiPumbleBot {
  constructor() {
    this.kimai = new PumbleTimesheetBot();
    this.pumble = new PumbleClient(config.pumble);
    this.analyzer = new TimesheetAnalyzer(config.payPeriod.minHoursExpected);
  }

  async checkTimesheets() {
    console.log('Starting timesheet check...');
    
    // Calculate date range for last pay period
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, config.payPeriod.days));

    // Fetch timesheets
    const timesheets = await this.kimai.exportCSV(startDate, endDate);
    console.log(`Fetched ${timesheets.length} timesheet entries`);

    // Analyze submissions
    const analysis = this.analyzer.analyzeTimesheets(timesheets);
    
    // Handle users with issues
    for (const user of Object.values(analysis)) {
      if (user.issues.length > 0) {
        await this.handleUserIssues(user);
      }
    }

    // Generate summary report
    await this.sendSummaryReport(analysis);
  }

  async handleUserIssues(user) {
    console.log(`Handling issues for ${user.name}`);

    // Get Pumble user ID
    const pumbleUserId = await this.pumble.getUserIdByEmail(user.email);
    if (!pumbleUserId) {
      console.error(`Could not find Pumble user for ${user.email}`);
      return;
    }

    // Create group chat with user and bot
    const chatName = `Timesheet Review - ${user.name}`;
    const chat = await this.pumble.createGroupChat([pumbleUserId, process.env.PUMBLE_BOT_ID], chatName);

    // Send issue summary
    const issueMessage = `Hi ${user.name},\n\n` +
      `I noticed some issues with your timesheet submission for the last pay period:\n\n` +
      user.issues.map(issue => `• ${issue.message}`).join('\n') +
      `\n\nPlease update your hours in Kimai or let me know if there's a reason for the discrepancy.\n\n` +
      `Current total: ${user.totalHours.toFixed(1)} hours`;

    await this.pumble.sendMessage(chat.id, issueMessage);
  }

  async sendSummaryReport(analysis) {
    const totalUsers = Object.keys(analysis).length;
    const usersWithIssues = Object.values(analysis).filter(u => u.issues.length > 0).length;

    const summaryMessage = `📊 **Timesheet Summary Report**\n\n` +
      `Period: Last ${config.payPeriod.days} days\n` +
      `Total employees: ${totalUsers}\n` +
      `Submissions with issues: ${usersWithIssues}\n\n` +
      `Please review and update your timesheets if needed.`;

    // Send to admin channel if configured
    if (process.env.ADMIN_CHANNEL_ID) {
      await this.pumble.sendMessage(process.env.ADMIN_CHANNEL_ID, summaryMessage);
    }
  }

  async sendPayPeriodReminder() {
    console.log('Sending pay period reminder...');

    const reminderMessage = `🔔 **Pay Period Reminder**\n\n` +
      `The current pay period is ending in ${config.payPeriod.reminderDaysBefore} days!\n\n` +
      `Please make sure to:\n` +
      `• Log all your hours in Kimai\n` +
      `• Add descriptions to your time entries\n` +
      `• Review your total hours for accuracy\n\n` +
      `👉 Go to Kimai: ${config.kimai.baseUrl}`;

    // Send to dev channel
    if (config.pumble.channels.dev) {
      await this.pumble.sendMessage(config.pumble.channels.dev, reminderMessage);
    }

    // Send to design channel
    if (config.pumble.channels.design) {
      await this.pumble.sendMessage(config.pumble.channels.design, reminderMessage);
    }
  }
}

// Export for different deployment scenarios
module.exports = { KimaiPumbleBot };

// Standalone execution
if (require.main === module) {
  const bot = new KimaiPumbleBot();
  
  const command = process.argv[2];
  switch (command) {
    case 'check':
      bot.checkTimesheets().catch(console.error);
      break;
    case 'remind':
      bot.sendPayPeriodReminder().catch(console.error);
      break;
    default:
      console.log('Usage: node kimai-pumble-bot.js [check|remind]');
  }
}