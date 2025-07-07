const axios = require('axios');

/**
 * Channel Manager
 * Handles finding or creating channels between bot and users
 * Separation of concerns - this is channel logic only
 */
class ChannelManager {
  constructor(config) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://api.pumble.com/v1';
    this.botId = config.botId;
    this.workspaceId = config.workspaceId;
    
    // Cache of user channels
    this.channelCache = new Map(); // userId -> channelId
    this.userCache = new Map(); // email/name -> userId
  }

  /**
   * Get or create a DM channel with a specific user
   * @param {string} userId - Target user's Pumble ID
   * @returns {Promise<string>} Channel ID
   */
  async getDMChannel(userId) {
    // Check cache first
    if (this.channelCache.has(userId)) {
      return this.channelCache.get(userId);
    }

    try {
      // First, try to find existing DM channel
      const channels = await this.listChannels();
      
      // Look for DM with this user
      const dmChannel = channels.find(channel => {
        // DM channels typically have 2 members
        if (channel.member_count === 2 && channel.is_private) {
          // Check if both bot and user are members
          return channel.members && 
                 channel.members.includes(this.botId) && 
                 channel.members.includes(userId);
        }
        return false;
      });

      if (dmChannel) {
        this.channelCache.set(userId, dmChannel.id);
        return dmChannel.id;
      }

      // If no existing DM, create one
      const newChannel = await this.createDMChannel(userId);
      this.channelCache.set(userId, newChannel.id);
      return newChannel.id;

    } catch (error) {
      throw new Error(`Failed to get/create DM channel with user ${userId}: ${error.message}`);
    }
  }

  /**
   * Get or create a group DM channel with multiple users
   * @param {Array<string>} userIds - Array of user IDs (not including bot)
   * @param {string} name - Optional channel name
   * @returns {Promise<Object>} Channel object with id
   */
  async getGroupChannel(userIds, name = null) {
    // Sort user IDs for consistent cache key
    const sortedIds = [...userIds, this.botId].sort();
    const cacheKey = sortedIds.join('-');
    
    // Check cache
    if (this.channelCache.has(cacheKey)) {
      return { id: this.channelCache.get(cacheKey) };
    }

    try {
      // Try to find existing group channel with these exact members
      const channels = await this.listChannels();
      
      const existingChannel = channels.find(channel => {
        if (!channel.is_private || !channel.members) return false;
        
        const channelMembers = [...channel.members].sort();
        return channelMembers.length === sortedIds.length &&
               channelMembers.every((id, idx) => id === sortedIds[idx]);
      });

      if (existingChannel) {
        this.channelCache.set(cacheKey, existingChannel.id);
        return { id: existingChannel.id, name: existingChannel.name };
      }

      // Create new group channel
      const newChannel = await this.createGroupChannel(userIds, name);
      this.channelCache.set(cacheKey, newChannel.id);
      return newChannel;

    } catch (error) {
      throw new Error(`Failed to get/create group channel: ${error.message}`);
    }
  }

  /**
   * Find user by email or name
   * @param {string} identifier - Email or username
   * @returns {Promise<Object>} User object with id
   */
  async findUser(identifier) {
    // Check cache
    if (this.userCache.has(identifier)) {
      return this.userCache.get(identifier);
    }

    try {
      const users = await this.listUsers();
      
      const user = users.find(u => 
        u.email === identifier || 
        u.username === identifier ||
        u.real_name === identifier ||
        u.display_name === identifier
      );

      if (user) {
        this.userCache.set(identifier, user);
        return user;
      }

      throw new Error(`User not found: ${identifier}`);

    } catch (error) {
      throw new Error(`Failed to find user ${identifier}: ${error.message}`);
    }
  }

  /**
   * List all accessible channels
   * @returns {Promise<Array>} Array of channel objects
   */
  async listChannels() {
    try {
      const response = await axios.get(`${this.baseUrl}/channels`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        },
        params: {
          workspace_id: this.workspaceId
        }
      });

      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to list channels: ${error.message}`);
    }
  }

  /**
   * List all users in workspace
   * @returns {Promise<Array>} Array of user objects
   */
  async listUsers() {
    try {
      const response = await axios.get(`${this.baseUrl}/users`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        },
        params: {
          workspace_id: this.workspaceId
        }
      });

      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }
  }

  /**
   * Create a DM channel with a user
   * @param {string} userId 
   * @returns {Promise<Object>} Channel object
   */
  async createDMChannel(userId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/conversations.open`,
        {
          users: userId, // Some APIs want single user for DM
          return_im: true
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.channel || response.data;
    } catch (error) {
      // Try alternative API format
      try {
        const response = await axios.post(
          `${this.baseUrl}/channels`,
          {
            is_private: true,
            members: [this.botId, userId]
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        return response.data;
      } catch (altError) {
        throw new Error(`Failed to create DM channel: ${error.message}`);
      }
    }
  }

  /**
   * Create a group channel with multiple users
   * @param {Array<string>} userIds 
   * @param {string} name 
   * @returns {Promise<Object>} Channel object
   */
  async createGroupChannel(userIds, name = null) {
    try {
      // Include bot in members
      const allMembers = [...userIds, this.botId];
      
      const response = await axios.post(
        `${this.baseUrl}/conversations.open`,
        {
          users: allMembers.join(','), // Some APIs want comma-separated
          name: name || `compliance-${Date.now()}`
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.channel || response.data;
    } catch (error) {
      // Try alternative API format
      try {
        const response = await axios.post(
          `${this.baseUrl}/channels`,
          {
            name: name || `compliance-${Date.now()}`,
            is_private: true,
            members: [...userIds, this.botId]
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        return response.data;
      } catch (altError) {
        throw new Error(`Failed to create group channel: ${error.message}`);
      }
    }
  }

  /**
   * Send a message to a channel
   * @param {string} channelId 
   * @param {string} text 
   * @returns {Promise<Object>} Message object
   */
  async sendMessage(channelId, text) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          channel_id: channelId,
          text: text
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.channelCache.clear();
    this.userCache.clear();
  }
}

module.exports = ChannelManager;