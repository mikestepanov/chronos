// Abstract messaging interface to support multiple platforms
class MessagingInterface {
  async sendMessage(channelId, text) {
    throw new Error('sendMessage must be implemented');
  }

  async sendDirectMessage(userId, text) {
    throw new Error('sendDirectMessage must be implemented');
  }

  async createGroupChat(userIds, name) {
    throw new Error('createGroupChat must be implemented');
  }

  async getUsers() {
    throw new Error('getUsers must be implemented');
  }

  async getUserByEmail(email) {
    throw new Error('getUserByEmail must be implemented');
  }

  async getChannels() {
    throw new Error('getChannels must be implemented');
  }

  formatMessage(title, sections) {
    throw new Error('formatMessage must be implemented');
  }
}

module.exports = MessagingInterface;