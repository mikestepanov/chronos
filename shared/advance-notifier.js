const PumbleClient = require('./pumble-client');
const { subHours, format } = require('date-fns');

class AdvanceNotifier {
  constructor(config) {
    this.pumble = new PumbleClient(config);
    this.notificationLeadTime = 60; // minutes
  }

  async scheduleNotification(scheduledTime, messageDetails) {
    const { channelId, channelName, messagePreview, messageType } = messageDetails;
    
    // Calculate when to send the advance notification
    const notificationTime = subHours(scheduledTime, 1);
    const now = new Date();
    
    // If notification time has passed, send immediately
    if (notificationTime <= now) {
      await this.sendNotification(scheduledTime, messageDetails);
      return;
    }
    
    // Calculate delay until notification time
    const delayMs = notificationTime.getTime() - now.getTime();
    
    console.log(`📅 Scheduling advance notification for ${format(notificationTime, 'yyyy-MM-dd HH:mm')}`);
    
    // Schedule the notification
    setTimeout(async () => {
      await this.sendNotification(scheduledTime, messageDetails);
    }, delayMs);
    
    return {
      notificationTime,
      scheduledTime,
      delayMs
    };
  }

  async sendNotification(scheduledTime, messageDetails) {
    const { channelId, channelName, messagePreview, messageType } = messageDetails;
    
    const notification = `🔔 **Upcoming ${messageType || 'Message'} Notification**

⏰ **Will be sent at:** ${format(scheduledTime, 'h:mm a')} (in 1 hour)
📍 **Target:** ${channelName}
📋 **Type:** ${messageType || 'Scheduled Message'}

📝 **Preview:**
${messagePreview}

_This is your 1-hour advance notification._`;

    try {
      await this.pumble.sendMessage(
        require('../../shared/channels').BOT_TO_MIKHAIL,
        notification
      );
      console.log('✅ Advance notification sent to Mikhail');
    } catch (error) {
      console.error('Failed to send advance notification:', error.message);
    }
  }

  // For immediate messages, this can be called directly
  async notifyImmediateMessage(channelId, channelName, messageText, messageType) {
    const preview = messageText.length > 300 
      ? messageText.substring(0, 300) + '...' 
      : messageText;
    
    const notification = `🔔 **Message Sent Notification**

📍 **Sent to:** ${channelName}
📋 **Type:** ${messageType || 'Direct Message'}
🕐 **Sent at:** ${format(new Date(), 'h:mm a')}

📝 **Full Message:**
${preview}

_This message was just sent to ${channelName}._`;

    try {
      // Don't notify about notifications or DMs to Mikhail
      const isDMToMikhail = channelId === require('../../shared/channels').BOT_TO_MIKHAIL;
      if (!isDMToMikhail) {
        await this.pumble.sendMessage(
          require('../../shared/channels').BOT_TO_MIKHAIL,
          notification
        );
      }
    } catch (error) {
      console.error('Failed to send notification:', error.message);
    }
  }
}

module.exports = AdvanceNotifier;