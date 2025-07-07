const KimaiExtractionService = require('../index');
const ExtractionQueue = require('./extraction-queue');
const ChannelManager = require('../services/ChannelManager');
const UserMapping = require('../services/UserMapping');
const { format } = require('date-fns');

/**
 * Pumble Compliance Bot
 * Monitors timesheet compliance and handles re-extraction requests
 */
class PumbleComplianceBot {
  constructor(config) {
    this.kimaiService = new KimaiExtractionService();
    this.config = config;
    
    // Initialize channel manager
    this.channelManager = new ChannelManager({
      apiToken: config.pumbleApiToken || config.pumbleClient?.apiToken,
      baseUrl: config.pumbleBaseUrl,
      botId: config.botUserId,
      workspaceId: config.workspaceId
    });
    
    // Initialize user mapping
    this.userMapping = new UserMapping(config.userMappingFile);
    this.userMappingLoaded = false;
    
    // Track active compliance checks
    this.activeChecks = new Map(); // userId -> { periodId, channelId, startedAt }
    
    // Initialize extraction queue
    this.extractionQueue = new ExtractionQueue();
    this.setupQueueHandler();
  }

  /**
   * Set up extraction queue handler
   */
  setupQueueHandler() {
    this.extractionQueue.on('extract', async ({ periodId, requests, resolve, reject }) => {
      try {
        console.log(`Executing extraction for period ${periodId} (${requests.length} requests)`);
        
        // Perform the actual extraction
        const { result, changes } = await this.kimaiService.reExtractAndCompare(periodId);
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check compliance on Tuesday morning
   * Creates 3-way chats for offenders
   */
  async checkTuesdayCompliance() {
    console.log('Starting Tuesday compliance check...');
    
    // Get current period
    const period = this.kimaiService.payPeriod.getCurrentPeriod();
    
    // Extract current data (this will be v1 or latest)
    const result = await this.kimaiService.extractPeriod(period);
    
    if (!result.success) {
      console.error('Failed to extract data for compliance check');
      return;
    }
    
    // Analyze CSV for missing hours
    const csv = result.csvData;
    const offenders = await this.analyzeMissingHours(csv, period);
    
    console.log(`Found ${offenders.length} users with missing hours`);
    
    // Create 3-way chats for each offender
    for (const offender of offenders) {
      await this.createComplianceChat(offender, period);
    }
    
    return {
      period: period.id,
      offendersCount: offenders.length,
      offenders: offenders.map(o => o.name)
    };
  }

  /**
   * Analyze CSV to find users with missing hours
   */
  async analyzeMissingHours(csvData, period) {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    
    // Parse CSV (adjust based on actual Kimai CSV format)
    const userHours = new Map();
    const workDays = this.getWorkDaysInPeriod(period);
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const fields = line.split(',');
      const userName = fields[headers.indexOf('User')];
      const hours = parseFloat(fields[headers.indexOf('Duration')]);
      const date = fields[headers.indexOf('Date')];
      
      if (!userHours.has(userName)) {
        userHours.set(userName, {
          name: userName,
          totalHours: 0,
          daysWorked: new Set()
        });
      }
      
      const user = userHours.get(userName);
      user.totalHours += hours;
      user.daysWorked.add(date);
    }
    
    // Find offenders (less than minimum hours or missing days)
    const offenders = [];
    const minHoursPerDay = this.config.minHoursPerDay || 8;
    const minTotalHours = workDays.length * minHoursPerDay * 0.9; // 90% threshold
    
    for (const [userName, data] of userHours) {
      if (data.totalHours < minTotalHours || data.daysWorked.size < workDays.length) {
        offenders.push({
          name: userName,
          userId: await this.getUserIdByName(userName),
          totalHours: data.totalHours,
          daysWorked: data.daysWorked.size,
          expectedDays: workDays.length,
          missingHours: Math.max(0, minTotalHours - data.totalHours)
        });
      }
    }
    
    return offenders;
  }

  /**
   * Create 3-way compliance chat
   */
  async createComplianceChat(offender, period) {
    const adminUserId = this.config.adminUserId; // You
    
    try {
      // Create or get 3-way channel (bot + admin + offender)
      const channel = await this.channelManager.getGroupChannel(
        [adminUserId, offender.userId],
        `compliance-${offender.name.toLowerCase().replace(/\s+/g, '-')}`
      );
      
      // Send compliance message
      const message = `🚨 **Timesheet Compliance Alert** 🚨

Hey ${offender.name}, you're supposed to submit your hours!

**Pay Period**: ${format(period.startDate, 'MMM dd')} - ${format(period.endDate, 'MMM dd')}
**Your Status**:
- Hours logged: ${offender.totalHours.toFixed(1)}
- Days logged: ${offender.daysWorked} of ${offender.expectedDays}
- Missing hours: ${offender.missingHours.toFixed(1)}

Please update your hours in Kimai ASAP and then reply with:
\`@${this.config.botName} done\`

I'll verify your submission and confirm.`;
      
      await this.channelManager.sendMessage(channel.id, message);
      
      // Track this compliance check
      this.activeChecks.set(offender.userId, {
        periodId: period.id,
        channelId: channel.id,
        offenderName: offender.name,
        startedAt: new Date(),
        initialHours: offender.totalHours,
        initialDays: offender.daysWorked
      });
      
      console.log(`Created compliance chat for ${offender.name} in channel ${channel.id}`);
      
    } catch (error) {
      console.error(`Failed to create compliance chat for ${offender.name}:`, error.message);
      
      // Fallback: try to DM the user directly
      try {
        const dmChannel = await this.channelManager.getDMChannel(offender.userId);
        await this.channelManager.sendMessage(dmChannel, message);
        
        this.activeChecks.set(offender.userId, {
          periodId: period.id,
          channelId: dmChannel,
          offenderName: offender.name,
          startedAt: new Date(),
          initialHours: offender.totalHours,
          initialDays: offender.daysWorked
        });
        
        console.log(`Fallback: Sent compliance message to ${offender.name} via DM`);
      } catch (dmError) {
        console.error(`Failed to send DM to ${offender.name}:`, dmError.message);
      }
    }
  }

  /**
   * Handle incoming messages (webhook endpoint)
   */
  async handleMessage(message) {
    // Check if message is directed at bot
    if (!message.text || !message.text.includes(`@${this.config.botName}`)) {
      return;
    }
    
    // Check if user has active compliance check
    const check = this.activeChecks.get(message.userId);
    if (!check) {
      return;
    }
    
    // Check if message contains "done"
    if (message.text.toLowerCase().includes('done')) {
      await this.handleDoneCommand(message.userId, check, message.channelId);
    }
  }

  /**
   * Handle "done" command - re-extract and verify
   */
  async handleDoneCommand(userId, check, channelId) {
    console.log(`User ${check.offenderName} claims to be done - triggering re-extraction`);
    
    await this.channelManager.sendMessage(channelId, 
      "⏳ Let me check your updated hours..."
    );
    
    // Wait a moment for Kimai to process any recent changes
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      // Queue extraction request
      const result = await this.extractionQueue.addRequest(
        check.periodId, 
        userId,
        { userName: check.offenderName, channelId }
      );
      
      if (result.fromCache) {
        console.log(`Using cached extraction for ${check.offenderName} (v${result.version})`);
        await this.channelManager.sendMessage(channelId, 
          `⚡ Using recent data (extracted ${Math.round((Date.now() - result.timestamp) / 1000)} seconds ago)...`
        );
      }
      
      if (!result.success) {
        await this.channelManager.sendMessage(channelId, 
          "❌ Failed to verify your hours. Please try again in a few minutes."
        );
        return;
      }
      
      if (result.queuedRequests > 1) {
        console.log(`Extraction served ${result.queuedRequests} concurrent requests`);
      }
    
      // Get the latest CSV and check this specific user
      const csv = result.csvData;
      const userStatus = await this.checkUserCompliance(userId, check.offenderName, csv);
      
      if (userStatus.compliant) {
        // Success message
        const improvement = userStatus.totalHours - check.initialHours;
        await this.channelManager.sendMessage(channelId, 
          `✅ **Verified!** 

Your hours have been updated:
- Total hours: ${userStatus.totalHours.toFixed(1)} (+${improvement.toFixed(1)})
- Days logged: ${userStatus.daysWorked}

Thank you for updating your timesheet! 🎉`
        );
        
        // Remove from active checks
        this.activeChecks.delete(userId);
        
        // Log success
        console.log(`User ${check.offenderName} is now compliant`);
      } else {
        // Still non-compliant
        await this.channelManager.sendMessage(channelId, 
          `⚠️ **Still Missing Hours**

Current status:
- Total hours: ${userStatus.totalHours.toFixed(1)}
- Days logged: ${userStatus.daysWorked}
- Still missing: ${userStatus.missingHours.toFixed(1)} hours

Please complete your timesheet and try again.`
        );
      }
      
    } catch (error) {
      console.error(`Error processing done command for ${check.offenderName}:`, error);
      await this.channelManager.sendMessage(channelId, 
        "❌ An error occurred while checking your hours. Please try again."
      );
      return;
    }
  }

  /**
   * Check if specific user is compliant in the CSV
   */
  async checkUserCompliance(userId, userName, csvData) {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    
    let totalHours = 0;
    const daysWorked = new Set();
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const fields = line.split(',');
      const csvUserName = fields[headers.indexOf('User')];
      
      if (csvUserName === userName) {
        const hours = parseFloat(fields[headers.indexOf('Duration')]);
        const date = fields[headers.indexOf('Date')];
        
        totalHours += hours;
        daysWorked.add(date);
      }
    }
    
    const minHoursPerDay = this.config.minHoursPerDay || 8;
    const expectedDays = this.config.expectedDaysPerPeriod || 10;
    const minTotalHours = expectedDays * minHoursPerDay * 0.9;
    
    return {
      totalHours,
      daysWorked: daysWorked.size,
      missingHours: Math.max(0, minTotalHours - totalHours),
      compliant: totalHours >= minTotalHours && daysWorked.size >= expectedDays
    };
  }

  /**
   * Get work days in period (excluding weekends)
   */
  getWorkDaysInPeriod(period) {
    const days = [];
    let current = new Date(period.startDate);
    
    while (current <= period.endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        days.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }

  /**
   * Helper to get user ID by name (implement based on your Pumble setup)
   */
  async getUserIdByName(userName) {
    // This would typically query Pumble API or use a mapping
    // For now, return a placeholder
    return `user_${userName.toLowerCase().replace(/\s+/g, '_')}`;
  }
}

module.exports = PumbleComplianceBot;