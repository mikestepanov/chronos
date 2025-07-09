const { subDays, startOfDay, endOfDay, addDays, isWithinInterval } = require('date-fns');
const csv = require('csv-parse/sync');

const ConfigLoader = require('../shared/config-loader');
const KimaiAPI = require('../kimai/services/KimaiAPI');
const MessagingFactory = require('../shared/messaging-factory');
const TimesheetAnalyzer = require('../shared/timesheet-analyzer');
const BotConfig = require('../shared/bot-config');

class KimaiTimesheetBot {
  constructor() {
    this.config = ConfigLoader.load();
    this.kimai = new KimaiAPI(this.config.kimai);
    this.messaging = MessagingFactory.create(
      this.config.messaging.platform,
      this.config.messaging[this.config.messaging.platform]
    );
    this.analyzer = new TimesheetAnalyzer(this.config.payPeriod);
  }

  async checkTimesheets() {
    console.log(`Starting timesheet check using ${this.config.messaging.platform}...`);
    
    // Calculate date range for last pay period
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, this.config.payPeriod.days));

    console.log(`Checking period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    try {
      // Fetch all users
      const users = await this.kimai.getUsers();
      console.log(`Found ${users.length} users in Kimai`);

      // Fetch timesheets
      const timesheets = await this.kimai.getTimesheets(startDate, endDate);
      console.log(`Fetched ${timesheets.length} timesheet entries`);

      // Analyze submissions
      const analysis = this.analyzer.analyzeTimesheets(timesheets, users);
      
      // Handle users with issues
      await this.handleAnalysisResults(analysis);

      // Send summary report
      await this.sendSummaryReport(analysis);

      console.log('Timesheet check completed');
    } catch (error) {
      console.error('Error during timesheet check:', error);
      await this.notifyManagerOfError(error);
    }
  }

  async handleAnalysisResults(analysis) {
    // Handle users with missing submissions
    for (const missing of analysis.summary.missingSubmissions) {
      await this.handleMissingSubmission(missing);
    }

    // Handle users with issues
    for (const [userId, report] of Object.entries(analysis.userReports)) {
      if (report.issues.length > 0) {
        await this.handleUserIssues(report);
      }
    }
  }

  async handleMissingSubmission(user) {
    console.log(`Handling missing submission for ${user.name}`);

    const messageData = BotConfig.formatMessage(this.config.bot.identity, 'missing_submission', {
      userName: user.name,
      kimaiUrl: this.config.kimai.baseUrl
    });
    
    const message = this.messaging.formatMessage(messageData.title, messageData.sections);

    // Try to find user in messaging platform
    const messagingUser = await this.messaging.getUserByEmail(user.email);
    if (messagingUser) {
      await this.createReviewChat(messagingUser, message);
    } else {
      console.warn(`Could not find messaging user for ${user.email}`);
    }
  }

  async handleUserIssues(report) {
    console.log(`Handling issues for ${report.name}`);

    // Get messaging user
    const messagingUser = await this.messaging.getUserByEmail(report.email);
    if (!messagingUser) {
      console.warn(`Could not find messaging user for ${report.email}`);
      return;
    }

    // Build issue message
    const issueMessages = report.issues.map(issue => issue.message);

    const messageData = BotConfig.formatMessage(this.config.bot.identity, 'issues_found', {
      userName: report.name,
      issues: issueMessages,
      totalHours: report.totalHours.toFixed(1),
      daysWorked: report.totalDays.size,
      avgHours: report.statistics.averageHoursPerDay.toFixed(1),
      kimaiUrl: this.config.kimai.baseUrl
    });
    
    const message = this.messaging.formatMessage(messageData.title, messageData.sections);

    await this.createReviewChat(messagingUser, message);
  }

  async createReviewChat(user, message) {
    try {
      // Create private chat with user, bot, and admin
      const participants = [user.id];
      
      // Add manager if configured (for oversight, not admin)
      if (this.config.managerEmail) {
        const manager = await this.messaging.getUserByEmail(this.config.managerEmail);
        if (manager) {
          participants.push(manager.id);
        }
      }

      // Add bot if configured
      if (this.config.messaging[this.config.messaging.platform].botId) {
        participants.push(this.config.messaging[this.config.messaging.platform].botId);
      }

      const chatName = `Timesheet Review - ${user.name || user.email}`;
      const chat = await this.messaging.createGroupChat(participants, chatName);

      // Send the message
      const messageText = typeof message === 'string' ? message : message.text || this.formatMessageText(message);
      await this.messaging.sendMessage(chat.id || chat.channel?.id, messageText);
    } catch (error) {
      console.error(`Failed to create review chat for ${user.email}:`, error);
    }
  }

  formatMessageText(messageObj) {
    if (messageObj.blocks) {
      // Slack-style formatted message
      return messageObj.text;
    }
    return messageObj;
  }

  async sendSummaryReport(analysis) {
    const stats = this.analyzer.generateSummaryStats(analysis);

    const sections = [
      {
        header: 'Period Summary',
        items: [
          `Total employees: ${analysis.summary.totalUsers + analysis.summary.missingSubmissions.length}`,
          `Submissions received: ${analysis.summary.totalUsers}`,
          `Missing submissions: ${analysis.summary.missingSubmissions.length}`,
          `Submissions with issues: ${analysis.summary.usersWithIssues}`
        ]
      }
    ];

    if (stats.usersUnderMinimum.length > 0) {
      sections.push({
        header: 'Under Minimum Hours',
        items: stats.usersUnderMinimum.map(u => `${u.name}: ${u.hours.toFixed(1)}h`)
      });
    }

    if (Object.keys(stats.projectTotals).length > 0) {
      const projectItems = Object.entries(stats.projectTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([project, hours]) => `${project}: ${hours.toFixed(1)}h`);
      
      sections.push({
        header: 'Top Projects',
        items: projectItems
      });
    }

    const messageData = BotConfig.formatMessage(this.config.bot.identity, 'summary', {
      sections
    });
    
    const summaryMessage = this.messaging.formatMessage(messageData.title, messageData.sections);

    // Send to admin channel if configured
    if (this.config.messaging.channels.admin) {
      const messageText = typeof summaryMessage === 'string' ? summaryMessage : summaryMessage.text || this.formatMessageText(summaryMessage);
      await this.messaging.sendMessage(this.config.messaging.channels.admin, messageText);
    }
  }

  async sendPayPeriodReminder() {
    console.log(`Sending pay period reminder via ${this.config.messaging.platform}...`);

    const nextPeriodEnd = addDays(new Date(), this.config.payPeriod.reminderDaysBefore);
    
    const messageData = BotConfig.formatMessage(this.config.bot.identity, 'reminder', {
      daysRemaining: this.config.payPeriod.reminderDaysBefore,
      kimaiUrl: this.config.kimai.baseUrl
    });
    
    const reminderMessage = this.messaging.formatMessage(messageData.title, messageData.sections);

    const messageText = typeof reminderMessage === 'string' ? reminderMessage : reminderMessage.text || this.formatMessageText(reminderMessage);

    // Send to dev channel
    if (this.config.messaging.channels.dev) {
      await this.messaging.sendMessage(this.config.messaging.channels.dev, messageText);
    }

    // Send to design channel
    if (this.config.messaging.channels.design) {
      await this.messaging.sendMessage(this.config.messaging.channels.design, messageText);
    }

    console.log('Pay period reminder sent');
  }

  async notifyManagerOfError(error) {
    if (this.config.managerEmail) {
      const manager = await this.messaging.getUserByEmail(this.config.managerEmail);
      if (manager) {
        const errorMessage = `🚨 ${this.config.bot.name} Error\n\n${error.message}\n\nPlease check the logs for more details.`;
        await this.messaging.sendDirectMessage(manager.id, errorMessage);
      }
    }
  }
}

// Command line interface
if (require.main === module) {
  const bot = new KimaiTimesheetBot();
  
  const command = process.argv[2];
  switch (command) {
    case 'check':
      bot.checkTimesheets().catch(console.error);
      break;
    case 'remind':
      bot.sendPayPeriodReminder().catch(console.error);
      break;
    default:
      console.log('Usage: node kimai-timesheet-bot.js [check|remind]');
      console.log('  check  - Check timesheets and notify users with issues');
      console.log('  remind - Send pay period reminder to channels');
  }
}

module.exports = KimaiTimesheetBot;