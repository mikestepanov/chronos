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
    const isDMToMikhail = channelId === require('./channels').BOT_TO_MIKHAIL;
    
    // Send the original message first
    const result = await this.originalSendMessage(channelId, text, asBot);
    
    // Send notification to Mikhail if it's not a DM to him
    if (!isDMToMikhail && require('./channels').BOT_TO_MIKHAIL) {
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
        require('./channels').BOT_TO_MIKHAIL,
        notification,
        false
      );
    } catch (error) {
      console.error('Failed to send notification to Mikhail:', error.message);
    }
  }

  getChannelName(channelId) {
    const channels = require('./channels');
    const channelMap = {
      [channels.DEV]: '#dev',
      [channels.DESIGN]: '#design',
      [channels.BOT_TESTING]: '#bot_testing',
      [channels.RANDOM]: '#random',
      [channels.BOT_TO_MIKHAIL]: 'DM with Mikhail'
    };
    return channelMap[channelId] || `Channel ${channelId}`;
  }
}

module.exports = NotificationWrapper;