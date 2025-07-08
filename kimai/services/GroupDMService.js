const fs = require('fs').promises;
const path = require('path');
const PumbleClient = require('../../shared/pumble-client');
const UserService = require('../../users/UserService');

/**
 * Service for sending group DMs (3+ person conversations)
 * Used for timesheet compliance notifications
 */
class GroupDMService {
  constructor(config = {}) {
    this.pumbleClient = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY || config.pumbleApiKey,
      botEmail: process.env.PUMBLE_BOT_EMAIL || config.botEmail,
      botId: process.env.PUMBLE_BOT_ID || config.botId
    });
    
    this.userService = new UserService();
    this.botId = process.env.PUMBLE_BOT_ID || config.botId;
    this.managerIds = config.managerIds || this.getManagerIds();
    this.cacheFile = path.join(__dirname, '../data/conversation-cache.json');
    this.conversationCache = null; // Will be loaded from file
  }

  /**
   * Get manager IDs from environment or config
   */
  getManagerIds() {
    // Option 1: From environment variable
    if (process.env.MANAGER_PUMBLE_IDS) {
      return process.env.MANAGER_PUMBLE_IDS.split(',').map(id => id.trim());
    }
    
    // Option 2: From user service by email
    const managerEmails = process.env.MANAGER_EMAILS?.split(',') || [];
    return managerEmails
      .map(email => {
        const user = this.userService.getActiveUsers().find(u => u.email === email.trim());
        return user?.services?.pumble?.id;
      })
      .filter(Boolean);
  }

  /**
   * Load conversation cache from file
   */
  async loadCache() {
    if (this.conversationCache) return this.conversationCache;
    
    try {
      const data = await fs.readFile(this.cacheFile, 'utf8');
      this.conversationCache = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
      this.conversationCache = {};
    }
    
    return this.conversationCache;
  }

  /**
   * Save conversation cache to file
   */
  async saveCache() {
    const dir = path.dirname(this.cacheFile);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.cacheFile, JSON.stringify(this.conversationCache, null, 2));
  }

  /**
   * Get or create group DM between bot, user, and managers
   */
  async getOrCreateGroupDM(userId, managerIds = null) {
    try {
      // Load cache
      await this.loadCache();
      
      // Always include bot in the conversation
      const managers = managerIds || this.managerIds;
      const participants = [this.botId, userId, ...managers];
      
      // Create cache key from sorted participant IDs
      const cacheKey = participants.sort().join('-');
      
      // Check cache first
      if (this.conversationCache[cacheKey]) {
        console.log(`Using cached conversation: ${this.conversationCache[cacheKey]}`);
        return this.conversationCache[cacheKey];
      }
      
      // Try to find existing conversation
      try {
        const channels = await this.pumbleClient.getChannels();
        
        const existingConvo = channels.find(channel => {
          if (!channel.isPrivate || !channel.members) return false;
          
          const memberIds = channel.members.map(m => m.id).sort();
          const expectedIds = participants.sort();
          
          // Check if same participants
          return memberIds.length === expectedIds.length &&
                 memberIds.every((id, idx) => id === expectedIds[idx]);
        });
        
        if (existingConvo) {
          console.log(`Found existing group DM: ${existingConvo.id}`);
          this.conversationCache[cacheKey] = existingConvo.id;
          await this.saveCache();
          return existingConvo.id;
        }
      } catch (error) {
        console.log('Could not check existing conversations:', error.message);
      }
      
      // Create new group DM
      console.log(`Creating new group DM with ${participants.length} participants`);
      const conversation = await this.pumbleClient.createGroupChat(
        participants,
        null, // Auto-generate name
        true  // Private
      );
      
      this.conversationCache[cacheKey] = conversation.id;
      await this.saveCache();
      return conversation.id;
      
    } catch (error) {
      console.error('Failed to get/create group DM:', error);
      throw error;
    }
  }

  /**
   * Send message to group DM
   */
  async sendGroupDM(userId, message) {
    try {
      // Get or create the group DM
      const conversationId = await this.getOrCreateGroupDM(userId);
      
      // Send the message
      await this.pumbleClient.sendMessage(conversationId, message, true);
      
      return { 
        success: true,
        conversationId,
        participants: [this.botId, userId, ...this.managerIds]
      };
      
    } catch (error) {
      console.error('Failed to send group DM:', error);
      throw error;
    }
  }

  /**
   * Send timesheet reminder group DM
   */
  async sendTimesheetReminder(user, timesheetData) {
    const { hours, missing, period } = timesheetData;
    
    // Format the message
    const message = [
      `⚠️ **Timesheet Reminder**`,
      ``,
      `${user.services?.pumble?.mention || user.name} has an incomplete timesheet:`,
      ``,
      `📊 Current hours: ${hours}h`,
      `⏳ Missing hours: ${missing}h`,
      `📅 Pay period: ${period.start} - ${period.end}`,
      ``,
      `Please complete your timesheet before the deadline.`,
      ``,
      `_Automated reminder sent to user + managers_`
    ].join('\n');
    
    return this.sendGroupDM(user.services.pumble.id, message);
  }

  /**
   * Send follow-up reminder (24h after first notice)
   */
  async sendFollowUpReminder(user, timesheetData) {
    const { hours, missing, period, daysLeft } = timesheetData;
    
    const urgency = daysLeft <= 1 ? '🚨 **URGENT**' : '⚠️ **Follow-Up**';
    
    const message = [
      `${urgency}: Timesheet Still Incomplete`,
      ``,
      `${user.services?.pumble?.mention || user.name} still needs to complete their timesheet:`,
      ``,
      `📊 Current: ${hours}h (Missing: ${missing}h)`,
      `⏰ Days left: ${daysLeft}`,
      `📅 Period ends: ${period.end}`,
      ``,
      `This is a 24-hour follow-up reminder.`,
      `Please complete immediately.`
    ].join('\n');
    
    return this.sendGroupDM(user.services.pumble.id, message);
  }
}

module.exports = GroupDMService;