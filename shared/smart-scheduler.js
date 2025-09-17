const PumbleClient = require('./pumble-client');
const { format, subMinutes, subHours } = require('date-fns');

/**
 * Smart Scheduler for Pumble Messages
 * 
 * Rules:
 * - Channel messages (scheduled): 1 hour advance notice
 * - DMs (scheduled): 1 hour advance notice  
 * - Response/reaction messages: 5 minute advance notice
 * - Immediate sends: Post-notification after sending
 */
class SmartScheduler {
  constructor(config) {
    this.pumble = new PumbleClient(config);
    this.config = config;
    
    // Track scheduled messages
    this.scheduledMessages = new Map();
  }

  /**
   * Schedule a message with appropriate advance notice
   */
  async scheduleMessage(options) {
    const {
      channelId,
      message,
      sendAt,
      messageType = 'scheduled',
      isResponse = false,
      targetName = null
    } = options;

    const now = new Date();
    const advanceMinutes = isResponse ? 5 : 60;
    const notificationTime = isResponse 
      ? subMinutes(sendAt, advanceMinutes)
      : subHours(sendAt, 1);

    // If notification time has passed, send immediately
    if (notificationTime <= now) {
      return await this.sendImmediate(channelId, message, messageType, targetName);
    }

    // Schedule advance notification
    const notificationDelay = notificationTime.getTime() - now.getTime();
    const messageDelay = sendAt.getTime() - now.getTime();

    const messageId = `${Date.now()}-${Math.random()}`;
    
    // Schedule notification
    const notificationTimer = setTimeout(() => {
      this.sendAdvanceNotification({
        channelId,
        targetName: targetName || this.getChannelName(channelId),
        message,
        sendAt,
        messageType,
        advanceMinutes
      });
    }, notificationDelay);

    // Schedule actual message
    const messageTimer = setTimeout(() => {
      this.pumble.sendMessage(channelId, message);
      this.scheduledMessages.delete(messageId);
    }, messageDelay);

    // Store for potential cancellation
    this.scheduledMessages.set(messageId, {
      notificationTimer,
      messageTimer,
      sendAt,
      channelId
    });

    console.log(`📅 Scheduled ${messageType}:`);
    console.log(`   - Notification at: ${format(notificationTime, 'h:mm a')}`);
    console.log(`   - Message at: ${format(sendAt, 'h:mm a')}`);

    return messageId;
  }

  /**
   * Send immediate message with post-notification
   */
  async sendImmediate(channelId, message, messageType = 'immediate', targetName = null) {
    // Send the message
    const result = await this.pumble.sendMessage(channelId, message);
    
    // Send post-notification (unless it's to Mikhail's DM)
    if (channelId !== require('../../shared/channels').BOT_TO_MIKHAIL) {
      await this.sendPostNotification({
        channelId,
        targetName: targetName || this.getChannelName(channelId),
        message,
        messageType
      });
    }

    return result;
  }

  /**
   * Send advance notification to Mikhail
   */
  async sendAdvanceNotification(details) {
    const { targetName, message, sendAt, messageType, advanceMinutes } = details;
    
    const preview = message.length > 400 
      ? message.substring(0, 400) + '...'
      : message;

    const notification = `🔔 **Upcoming ${messageType} - ${advanceMinutes} Minute Notice**

⏰ **Will be sent at:** ${format(sendAt, 'h:mm a')}
📍 **Target:** ${targetName}
📋 **Type:** ${messageType}

📝 **Message Preview:**
${preview}

_This is your ${advanceMinutes}-minute advance notification._`;

    try {
      await this.pumble.sendMessage(
        require('../../shared/channels').BOT_TO_MIKHAIL,
        notification
      );
    } catch (error) {
      console.error('Failed to send advance notification:', error.message);
    }
  }

  /**
   * Send post-notification for immediate messages
   */
  async sendPostNotification(details) {
    const { targetName, message, messageType } = details;
    
    const preview = message.length > 400 
      ? message.substring(0, 400) + '...'
      : message;

    const notification = `📬 **Message Sent - ${messageType}**

📍 **Sent to:** ${targetName}
🕐 **Time:** ${format(new Date(), 'h:mm a')}

📝 **Message:**
${preview}

_This message was just sent._`;

    try {
      await this.pumble.sendMessage(
        require('../../shared/channels').BOT_TO_MIKHAIL,
        notification
      );
    } catch (error) {
      console.error('Failed to send post-notification:', error.message);
    }
  }

  /**
   * Cancel a scheduled message
   */
  cancelScheduledMessage(messageId) {
    const scheduled = this.scheduledMessages.get(messageId);
    if (scheduled) {
      clearTimeout(scheduled.notificationTimer);
      clearTimeout(scheduled.messageTimer);
      this.scheduledMessages.delete(messageId);
      return true;
    }
    return false;
  }

  /**
   * Get friendly channel name
   */
  getChannelName(channelId) {
    const channelMap = {
      [require('./channels').DEV]: '#dev',
      [require('./channels').DESIGN]: '#design',
      [require('../../shared/channels').BOT_TO_MIKHAIL]: 'Mikhail (DM)',
    };
    return channelMap[channelId] || `Channel ${channelId}`;
  }
}

module.exports = SmartScheduler;