const PumbleClient = require('./pumble-client');

/**
 * Wraps the Pumble client to send notifications to Mikhail
 * for any messages sent to public channels
 */
class NotificationWrapper {
  constructor(pumbleClient) {
    this.client = pumbleClient;
    this.originalSendMessage = this.client.sendMessage.bind(this.client);
    
    // Override the sendMessage method
    this.client.sendMessage = this.sendMessageWithNotification.bind(this);
  }

  async sendMessageWithNotification(channelId, text, asBot = false) {
    // Check if this is a DM to Mikhail (don't notify about notifications)
    const isDMToMikhail = channelId === process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID;
    
    // Send the original message first
    const result = await this.originalSendMessage(channelId, text, asBot);
    
    // Send notification to Mikhail if it's not a DM to him
    if (!isDMToMikhail && process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID) {
      await this.notifyMikhail(channelId, text);
    }
    
    return result;
  }

  async notifyMikhail(channelId, messageText) {
    const channelName = this.getChannelName(channelId);
    const preview = messageText.length > 500 
      ? messageText.substring(0, 500) + '...'
      : messageText;
    
    const notification = `📬 **Message Sent Notification**

📍 **Sent to:** ${channelName}
🕐 **Time:** ${new Date().toLocaleTimeString()}

📝 **Message:**
${preview}

_This message was just sent by the Agent Smith bot._`;

    try {
      await this.originalSendMessage(
        process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID,
        notification,
        false
      );
    } catch (error) {
      console.error('Failed to send notification to Mikhail:', error.message);
    }
  }

  getChannelName(channelId) {
    const channelMap = {
      [process.env.DEV_CHANNEL_ID]: '#dev',
      [process.env.DESIGN_CHANNEL_ID]: '#design',
      [process.env.ADMIN_CHANNEL_ID]: '#admin',
      [process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID]: 'DM with Mikhail',
      [process.env.MIKHAIL_PERSONAL_DM_CHANNEL_ID]: 'Mikhail Personal DM'
    };
    return channelMap[channelId] || `Channel ${channelId}`;
  }
}

module.exports = NotificationWrapper;