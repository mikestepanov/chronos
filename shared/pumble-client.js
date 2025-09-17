const axios = require('axios');
const MessagingInterface = require('./messaging-interface');
const { ErrorHandler, ExternalServiceError, AuthenticationError } = require('./error-handler');

class PumbleClient extends MessagingInterface {
  constructor(config) {
    super();
    this.apiKey = config.apiKey;
    this.botEmail = config.botEmail;
    this.botId = config.botId;
    this.baseUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
  }

  async sendMessage(channelId, text, asBot = false) {
    // IMPORTANT: asBot MUST BE ALWAYS FALSE - Agent Smith authenticates as a real user, not a bot
    return ErrorHandler.wrapWithLogging(async () => {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        channelId,
        text,
        asBot
      }, {
        headers: { 'Api-Key': this.apiKey }
      });
      return response.data;
    }, {
      operation: 'sendMessage',
      channelId,
      service: 'pumble'
    }).catch(error => {
      if (error.response?.status === 401) {
        throw new AuthenticationError('Invalid Pumble API key');
      }
      throw new ExternalServiceError('Pumble', error.message, error);
    });
  }

  async sendDirectMessage(userId, text) {
    return ErrorHandler.wrapWithLogging(async () => {
      const response = await axios.post(`${this.baseUrl}/sendDirectMessage`, {
        userId,
        text,
        asBot: false
      }, {
        headers: { 'Api-Key': this.apiKey }
      });
      return response.data;
    }, {
      operation: 'sendDirectMessage',
      userId,
      service: 'pumble'
    }).catch(error => {
      if (error.response?.status === 401) {
        throw new AuthenticationError('Invalid Pumble API key');
      }
      throw new ExternalServiceError('Pumble', error.message, error);
    });
  }

  async createGroupChat(userIds, name, isPrivate = true) {
    try {
      const response = await axios.post(`${this.baseUrl}/createChannel`, {
        name,
        type: isPrivate ? 'private' : 'public',
        members: userIds
      }, {
        headers: { 'Api-Key': this.apiKey }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create group chat:', error.message);
      throw new Error(`Failed to create chat: ${error.message}`);
    }
  }

  async getUsers() {
    try {
      const response = await axios.get(`${this.baseUrl}/users`, {
        headers: { 'Api-Key': this.apiKey }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error.message);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  async getUserByEmail(email) {
    try {
      const users = await this.getUsers();
      return users.find(u => u.email === email) || null;
    } catch (error) {
      console.error('Failed to find user by email:', error.message);
      return null;
    }
  }

  async getChannels() {
    try {
      const response = await axios.get(`${this.baseUrl}/listChannels`, {
        headers: { 'Api-Key': this.apiKey }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch channels:', error.message);
      throw new Error(`Failed to fetch channels: ${error.message}`);
    }
  }

  async sendReply(channelId, messageId, text) {
    try {
      const response = await axios.post(`${this.baseUrl}/sendReply`, {
        channelId,
        messageId,
        text,
        asBot: false
      }, {
        headers: { 'Api-Key': this.apiKey }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send reply:', error.message);
      throw new Error(`Failed to send reply: ${error.message}`);
    }
  }

  formatMessage(title, sections) {
    let message = `**${title}**\n\n`;
    
    sections.forEach(section => {
      if (section.header) {
        message += `*${section.header}*\n`;
      }
      if (section.items) {
        section.items.forEach(item => {
          message += `• ${item}\n`;
        });
      }
      if (section.text) {
        message += `${section.text}\n`;
      }
      message += '\n';
    });

    return message.trim();
  }
}

module.exports = PumbleClient;