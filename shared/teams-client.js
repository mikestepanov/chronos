const axios = require('axios');
const MessagingInterface = require('./messaging-interface');

class TeamsClient extends MessagingInterface {
  constructor(config) {
    super();
    this.webhookUrl = config.webhookUrl;
    this.botId = config.botId;
    this.tenantId = config.tenantId;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = 'https://graph.microsoft.com/v1.0';
    this.token = null;
  }

  async authenticate() {
    try {
      const response = await axios.post(
        `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      this.token = response.data.access_token;
      return this.token;
    } catch (error) {
      console.error('Teams authentication failed:', error.message);
      throw new Error(`Teams auth failed: ${error.message}`);
    }
  }

  async sendMessage(channelId, text) {
    // For Teams, we'll use webhook for channel messages
    if (this.webhookUrl) {
      return this.sendWebhookMessage(text);
    }
    
    // Otherwise use Graph API
    if (!this.token) await this.authenticate();
    
    try {
      const [teamId, actualChannelId] = channelId.split(':');
      const response = await axios.post(
        `${this.baseUrl}/teams/${teamId}/channels/${actualChannelId}/messages`,
        {
          body: {
            content: text
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to send Teams message:', error.message);
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async sendWebhookMessage(text) {
    try {
      const card = this.createAdaptiveCard(text);
      const response = await axios.post(this.webhookUrl, card);
      return response.data;
    } catch (error) {
      console.error('Failed to send Teams webhook message:', error.message);
      throw new Error(`Failed to send webhook message: ${error.message}`);
    }
  }

  createAdaptiveCard(text) {
    return {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            body: [
              {
                type: 'TextBlock',
                text: text,
                wrap: true
              }
            ],
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.2'
          }
        }
      ]
    };
  }

  async sendDirectMessage(userId, text) {
    if (!this.token) await this.authenticate();
    
    try {
      // Create a chat with the user
      const chatResponse = await axios.post(
        `${this.baseUrl}/chats`,
        {
          chatType: 'oneOnOne',
          members: [
            {
              '@odata.type': '#microsoft.graph.aadUserConversationMember',
              roles: ['owner'],
              'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const chatId = chatResponse.data.id;

      // Send message to the chat
      const messageResponse = await axios.post(
        `${this.baseUrl}/chats/${chatId}/messages`,
        {
          body: {
            content: text
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return messageResponse.data;
    } catch (error) {
      console.error('Failed to send Teams DM:', error.message);
      throw new Error(`Failed to send DM: ${error.message}`);
    }
  }

  async createGroupChat(userIds, name) {
    if (!this.token) await this.authenticate();
    
    try {
      const members = userIds.map(userId => ({
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ['owner'],
        'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`
      }));

      const response = await axios.post(
        `${this.baseUrl}/chats`,
        {
          chatType: 'group',
          topic: name,
          members
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to create Teams group chat:', error.message);
      throw new Error(`Failed to create group: ${error.message}`);
    }
  }

  async getUsers() {
    if (!this.token) await this.authenticate();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/users?$select=id,displayName,mail`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        }
      );
      return response.data.value;
    } catch (error) {
      console.error('Failed to fetch Teams users:', error.message);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  async getUserByEmail(email) {
    if (!this.token) await this.authenticate();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/users?$filter=mail eq '${email}'`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        }
      );
      return response.data.value[0] || null;
    } catch (error) {
      console.error('Failed to find Teams user by email:', error.message);
      return null;
    }
  }

  async getChannels() {
    // Teams channels require team ID, so this is a simplified version
    if (!this.token) await this.authenticate();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/me/joinedTeams`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        }
      );
      return response.data.value;
    } catch (error) {
      console.error('Failed to fetch Teams channels:', error.message);
      throw new Error(`Failed to fetch channels: ${error.message}`);
    }
  }

  formatMessage(title, sections) {
    // Create Teams adaptive card
    const card = {
      type: 'AdaptiveCard',
      body: [
        {
          type: 'TextBlock',
          size: 'Large',
          weight: 'Bolder',
          text: title
        }
      ],
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.2'
    };

    sections.forEach(section => {
      if (section.header) {
        card.body.push({
          type: 'TextBlock',
          weight: 'Bolder',
          text: section.header,
          spacing: 'Medium'
        });
      }

      if (section.items) {
        section.items.forEach(item => {
          card.body.push({
            type: 'TextBlock',
            text: `• ${item}`,
            wrap: true
          });
        });
      }

      if (section.text) {
        card.body.push({
          type: 'TextBlock',
          text: section.text,
          wrap: true,
          spacing: 'Small'
        });
      }
    });

    // Return both card and plain text
    return {
      card,
      text: this.formatPlainText(title, sections)
    };
  }

  formatPlainText(title, sections) {
    let message = `**${title}**\n\n`;
    
    sections.forEach(section => {
      if (section.header) {
        message += `**${section.header}**\n`;
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

module.exports = TeamsClient;