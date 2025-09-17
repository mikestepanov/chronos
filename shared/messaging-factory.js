const PumbleClient = require('./pumble-client');
const NotificationWrapper = require('./notification-wrapper');

class MessagingFactory {
  static create(platform, config, options = {}) {
    let client;
    
    switch (platform.toLowerCase()) {
      case 'pumble':
        client = new PumbleClient(config);
        break;
      
      default:
        throw new Error(`Unsupported messaging platform: ${platform}`);
    }
    
    // Wrap with notification system if enabled
    if (options.enableNotifications && platform === 'pumble') {
      new NotificationWrapper(client);
    }
    
    return client;
  }

  static getAvailablePlatforms() {
    return ['pumble', 'slack', 'teams'];
  }
}

module.exports = MessagingFactory;