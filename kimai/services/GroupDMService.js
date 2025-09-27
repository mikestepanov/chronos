const fs = require('fs').promises;
const path = require('path');
const PumbleClient = require('../../shared/pumble-client');
const UserService = require('../../config/users/UserService');

/**
 * Service for sending group DMs (3+ person conversations)
 * Used for timesheet compliance notifications
 */
class GroupDMService {
  constructor(config = {}) {
    this.pumbleClient = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY || config.pumbleApiKey,
      botId: require('../../shared/bots').DEFAULT_BOT_ID
    });
    
    this.userService = new UserService();
    this.botId = require('../../shared/bots').DEFAULT_BOT_ID;
    
    // Get Mikhail's ID from users.json
    const mikhail = this.userService.getActiveUsers().find(u => u.id === 'mikhail-stepanov');
    this.mikhailId = mikhail.services.pumble.id;
    
    this.cacheFile = path.join(__dirname, '../data/conversation-cache.json');
    this.conversationCache = null; // Will be loaded from file
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
   * Get or create group DM between bot, user, and Mikhail
   */
  async getOrCreateGroupDM(userId) {
    try {
      // Load cache
      await this.loadCache();
      
      // Group DM participants: bot, user, and Mikhail
      const participants = [this.botId, userId, this.mikhailId];
      
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
    const { hours, period } = timesheetData;
    
    // Get expected hours from user data (default to 80 if not specified)
    const expectedHours = user.expectedHours || 80;
    const acceptableMinimum = expectedHours - 3; // 3 hours tolerance is the maximum allowed
    
    // Format dates
    const { format } = require('date-fns');
    const periodStr = `${format(period.start, 'MMM d')} - ${format(period.end, 'MMM d')}`;
    
    // Period number is always defined
    const periodNumber = period.number;
    
    // Format the message
    const message = `Hi ${user.name},

You logged **${hours} hours**, which is less than the acceptable range of **${acceptableMinimum} hours**. Expected hours are **${expectedHours}** for you for each pay period.

**Pay Period #${periodNumber}:** ${periodStr}

Please double check that you didn't miss the submission - ignore this message if you think your submission is right.

cc: @mikhail`;
    
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