/**
 * MessageSender - Unified service for sending messages via Pumble
 * 
 * Features:
 * - Template-based messages
 * - Channel and DM support
 * - Group DM creation
 * - Scheduled sending
 * - Dry run mode
 */

const fs = require('fs');
const path = require('path');
const DateHelper = require('../shared/date-helper');
const PumbleClient = require('../shared/pumble-client');
const GroupDMService = require('../kimai/services/GroupDMService');
const PayPeriodCalculator = require('../shared/pay-period-calculator');

class MessageSender {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    
    // Load configurations
    this.templates = this.loadTemplates();
    this.channels = this.loadChannels();
    this.users = this.loadUsers();
    
    // Initialize clients
    this.pumbleClient = null;
    this.groupDMService = null;
  }

  /**
   * Initialize Pumble client
   */
  async init() {
    if (!this.pumbleClient) {
      // Load bot config
      const botsConfig = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../config/bots.json'), 'utf8')
      );
      const appConfig = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../config/app.json'), 'utf8')
      );
      
      const botIdentity = appConfig.app.defaultBotIdentity || 'agentsmith';
      const bot = botsConfig.bots[botIdentity];
      
      const pumbleConfig = {
        apiKey: bot.apiKey || process.env.PUMBLE_API_KEY,
        botEmail: bot.email,
        botId: bot.id
      };
      
      this.pumbleClient = new PumbleClient(pumbleConfig);
      this.groupDMService = new GroupDMService();
    }
  }

  /**
   * Send a message using template or direct text
   */
  async send(options) {
    await this.init();
    
    const { 
      template, 
      preset,
      message, 
      channel, 
      user, 
      groupDM,
      variables = {},
      schedule 
    } = options;

    // Build message content
    let content;
    if (preset) {
      content = this.buildFromPreset(preset, variables);
    } else if (template) {
      content = this.buildFromTemplate(template, variables);
    } else if (message) {
      content = message;
    } else {
      throw new Error('Must provide template, preset, or message');
    }

    // Determine recipient
    const recipient = await this.resolveRecipient({ channel, user, groupDM });
    
    // Handle scheduling
    if (schedule) {
      return this.scheduleSend(content, recipient, schedule);
    }

    // Send message
    return this.sendMessage(content, recipient);
  }

  /**
   * Build message from template
   */
  buildFromTemplate(templateName, variables) {
    const template = this.templates.templates[templateName];
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    let content = template.template;
    
    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    // Handle dynamic variables
    content = this.replaceDynamicVariables(content);

    return content;
  }

  /**
   * Build message from preset
   */
  buildFromPreset(presetName, overrides = {}) {
    const preset = this.templates.presets[presetName];
    if (!preset) {
      throw new Error(`Preset '${presetName}' not found`);
    }

    const variables = { ...preset.values, ...overrides };
    return this.buildFromTemplate(preset.template, variables);
  }

  /**
   * Replace dynamic variables like currentPeriod
   */
  replaceDynamicVariables(content) {
    const calculator = new PayPeriodCalculator();
    const currentPeriod = calculator.getCurrentPeriodInfo();
    
    const dynamicVars = {
      currentPeriod: currentPeriod.currentPeriod.number,
      currentDateRange: DateHelper.formatPeriodRange(currentPeriod.currentPeriod.startDate, currentPeriod.currentPeriod.endDate),
      today: DateHelper.formatFullWithWeekday(new Date()),
      timestamp: new Date().toISOString()
    };

    Object.entries(dynamicVars).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return content;
  }

  /**
   * Resolve recipient ID from channel name, username, or group DM
   */
  async resolveRecipient({ channel, user, groupDM }) {
    if (channel) {
      // Check if it's a known channel name
      let channelConfig = this.channels[channel];
      
      // If not found, check if it's a raw ID
      if (!channelConfig && channel.match(/^[a-z0-9]{24}$/i)) {
        return { type: 'channel', id: channel };
      }

      // If still not found, try alternative naming
      if (!channelConfig) {
        // Try replacing hyphens with underscores
        const altName = channel.replace(/-/g, '_');
        channelConfig = this.channels[altName];
      }
      
      if (!channelConfig) {
        throw new Error(`Channel '${channel}' not found in config`);
      }
      return { type: 'channel', id: channelConfig.id };
    }

    if (user) {
      // Find user in config
      const userConfig = this.users.users.find(u => 
        u.id === user || 
        u.name.toLowerCase() === user.toLowerCase() ||
        u.username === user
      );
      
      if (!userConfig) {
        throw new Error(`User '${user}' not found`);
      }

      // Return DM recipient info directly since we use sendDirectMessage
      return { type: 'dm', id: userConfig.services.pumble.id, user: userConfig };
    }

    if (groupDM) {
      // Create group DM
      const users = Array.isArray(groupDM) ? groupDM : [groupDM];
      const userConfigs = users.map(u => {
        const config = this.users.users.find(uc => 
          uc.id === u || 
          uc.name.toLowerCase() === u.toLowerCase() ||
          uc.username === u
        );
        if (!config) throw new Error(`User '${u}' not found`);
        return config;
      });

      const conversationId = await this.groupDMService.getOrCreateGroupDM(userConfigs);
      return { type: 'group', id: conversationId, users: userConfigs };
    }

    throw new Error('Must specify channel, user, or groupDM');
  }

  /**
   * Send message to recipient
   */
  async sendMessage(content, recipient) {
    if (this.verbose) {
      console.log('\n📤 Sending message:');
      console.log(`  Type: ${recipient.type}`);
      console.log(`  Recipient: ${this.getRecipientName(recipient)}`);
      console.log(`  Content: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
    }

    if (this.dryRun) {
      console.log('\n🔍 DRY RUN - Message not sent');
      console.log('Full message:');
      console.log('---');
      console.log(content);
      console.log('---');
      return { success: true, dryRun: true };
    }

    try {
      let result;
      if (recipient.type === 'dm') {
        result = await this.pumbleClient.sendDirectMessage(recipient.id, content);
      } else {
        result = await this.pumbleClient.sendMessage(recipient.id, content, false);
      }
      
      if (this.verbose) {
        console.log('✅ Message sent successfully');
      }
      
      return { 
        success: true, 
        messageId: result.id,
        timestamp: new Date().toISOString(),
        recipient
      };
    } catch (error) {
      console.error('❌ Failed to send message:', error.message);
      throw error;
    }
  }

  /**
   * Schedule message for later
   */
  async scheduleSend(content, recipient, scheduleTime) {
    const sendTime = this.parseScheduleTime(scheduleTime);
    const now = new Date();
    
    if (sendTime <= now) {
      throw new Error('Schedule time must be in the future');
    }

    const delay = sendTime - now;
    
    console.log(`⏰ Message scheduled for ${DateHelper.format(sendTime, 'PPpp')}`);
    console.log(`   (in ${Math.round(delay / 1000 / 60)} minutes)`);

    if (this.dryRun) {
      console.log('🔍 DRY RUN - Schedule not created');
      return { success: true, dryRun: true, scheduledFor: sendTime };
    }

    setTimeout(() => {
      this.sendMessage(content, recipient);
    }, delay);

    return { 
      success: true, 
      scheduledFor: sendTime,
      delay: delay
    };
  }

  /**
   * Parse schedule time string
   */
  parseScheduleTime(schedule) {
    // Handle specific times like "1pm", "13:00"
    if (schedule.match(/^\d{1,2}(:\d{2})?\s*(am|pm)?$/i)) {
      const today = new Date();
      const [time, period] = schedule.split(/\s+/);
      const [hours, minutes = 0] = time.split(':').map(Number);
      
      let hour = hours;
      if (period?.toLowerCase() === 'pm' && hour < 12) hour += 12;
      if (period?.toLowerCase() === 'am' && hour === 12) hour = 0;
      
      today.setHours(hour, minutes, 0, 0);
      return today;
    }

    // Handle relative times like "5m", "1h"
    const relativeMatch = schedule.match(/^(\d+)\s*(m|min|h|hour|d|day)s?$/i);
    if (relativeMatch) {
      const [, amount, unit] = relativeMatch;
      const now = new Date();
      
      switch (unit.toLowerCase()[0]) {
        case 'm': return new Date(now.getTime() + amount * 60 * 1000);
        case 'h': return new Date(now.getTime() + amount * 60 * 60 * 1000);
        case 'd': return new Date(now.getTime() + amount * 24 * 60 * 60 * 1000);
      }
    }

    // Try parsing as date
    const date = new Date(schedule);
    if (!isNaN(date.getTime())) {
      return date;
    }

    throw new Error(`Invalid schedule time: ${schedule}`);
  }

  /**
   * Get recipient display name
   */
  getRecipientName(recipient) {
    switch (recipient.type) {
      case 'channel':
        const channel = Object.entries(this.channels).find(([, c]) => c.id === recipient.id);
        return channel ? `#${channel[0]}` : recipient.id;
      
      case 'dm':
        return `@${recipient.user.name}`;
      
      case 'group':
        return `Group DM (${recipient.users.map(u => u.name).join(', ')})`;
      
      default:
        return recipient.id;
    }
  }

  /**
   * Load templates configuration
   */
  loadTemplates() {
    const templatesPath = path.join(__dirname, '../config/message-templates.json');
    return JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
  }

  /**
   * Load channels configuration
   */
  loadChannels() {
    const channelsPath = path.join(__dirname, '../config/channels.json');
    const channelsData = JSON.parse(fs.readFileSync(channelsPath, 'utf8'));
    return channelsData.pumble;
  }

  /**
   * Load users configuration
   */
  loadUsers() {
    const usersPath = path.join(__dirname, '../config/users/users.json');
    return JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  }

  /**
   * List available templates and presets
   */
  listTemplates() {
    console.log('\n📝 Available Templates:');
    Object.entries(this.templates.templates).forEach(([name, template]) => {
      console.log(`  ${name}: ${template.description}`);
      console.log(`    Variables: ${template.variables.join(', ')}`);
    });

    console.log('\n🎯 Available Presets:');
    Object.entries(this.templates.presets).forEach(([name, preset]) => {
      console.log(`  ${name}: Uses '${preset.template}' template`);
    });
  }

  /**
   * List available channels
   */
  listChannels() {
    console.log('\n📢 Available Channels:');
    Object.entries(this.channels).forEach(([name, channel]) => {
      console.log(`  ${name}: ${channel.name || name}`);
    });
  }

  /**
   * List available users
   */
  listUsers() {
    console.log('\n👥 Available Users:');
    this.users.users.forEach(user => {
      if (user.active) {
        console.log(`  ${user.id}: ${user.name} (@${user.username})`);
      }
    });
  }
}

module.exports = MessageSender;