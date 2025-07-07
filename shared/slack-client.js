const axios = require('axios');
const MessagingInterface = require('./messaging-interface');

class SlackClient extends MessagingInterface {
  constructor(config) {
    super();
    this.token = config.token;
    this.botId = config.botId;
    this.baseUrl = 'https://slack.com/api';
  }

  async sendMessage(channelId, text) {
    try {
      const response = await axios.post(`${this.baseUrl}/chat.postMessage`, {
        channel: channelId,
        text: text,
        as_user: true
      }, {
        headers: { 
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data.ok) {
        throw new Error(response.data.error);
      }

      return response.data;
    } catch (error) {
      console.error('Failed to send Slack message:', error.message);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async sendDirectMessage(userId, text) {
    try {
      // Open a DM channel first
      const openResponse = await axios.post(`${this.baseUrl}/conversations.open`, {
        users: userId
      }, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (!openResponse.data.ok) {
        throw new Error(openResponse.data.error);
      }

      const channelId = openResponse.data.channel.id;
      return await this.sendMessage(channelId, text);
    } catch (error) {
      console.error('Failed to send Slack DM:', error.message);
      throw new Error(`Failed to send DM: ${error.message}`);
    }
  }

  async createGroupChat(userIds, name) {
    try {
      // Create private channel
      const createResponse = await axios.post(`${this.baseUrl}/conversations.create`, {
        name: name.toLowerCase().replace(/\s+/g, '-'),
        is_private: true
      }, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (!createResponse.data.ok) {
        throw new Error(createResponse.data.error);
      }

      const channelId = createResponse.data.channel.id;

      // Invite users
      if (userIds.length > 0) {
        await axios.post(`${this.baseUrl}/conversations.invite`, {
          channel: channelId,
          users: userIds.join(',')
        }, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
      }

      return createResponse.data.channel;
    } catch (error) {
      console.error('Failed to create Slack group:', error.message);
      throw new Error(`Failed to create group: ${error.message}`);
    }
  }

  async getUsers() {
    try {
      const response = await axios.get(`${this.baseUrl}/users.list`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (!response.data.ok) {
        throw new Error(response.data.error);
      }

      return response.data.members.filter(u => !u.is_bot && !u.deleted);
    } catch (error) {
      console.error('Failed to fetch Slack users:', error.message);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  async getUserByEmail(email) {
    try {
      const response = await axios.get(`${this.baseUrl}/users.lookupByEmail`, {
        params: { email },
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (!response.data.ok) {
        return null;
      }

      return response.data.user;
    } catch (error) {
      console.error('Failed to find Slack user by email:', error.message);
      return null;
    }
  }

  async getChannels() {
    try {
      const response = await axios.get(`${this.baseUrl}/conversations.list`, {
        params: {
          types: 'public_channel,private_channel'
        },
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (!response.data.ok) {
        throw new Error(response.data.error);
      }

      return response.data.channels;
    } catch (error) {
      console.error('Failed to fetch Slack channels:', error.message);
      throw new Error(`Failed to fetch channels: ${error.message}`);
    }
  }

  formatMessage(title, sections) {
    // Slack formatting
    let blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: title
        }
      }
    ];

    sections.forEach(section => {
      if (section.header) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${section.header}*`
          }
        });
      }

      if (section.items) {
        const itemText = section.items.map(item => `• ${item}`).join('\n');
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: itemText
          }
        });
      }

      if (section.text) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: section.text
          }
        });
      }
    });

    // Return both blocks and text for compatibility
    return {
      blocks,
      text: this.formatPlainText(title, sections)
    };
  }

  formatPlainText(title, sections) {
    let message = `*${title}*\n\n`;
    
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

module.exports = SlackClient;