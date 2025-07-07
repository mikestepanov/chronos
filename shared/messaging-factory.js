const PumbleClient = require('./pumble-client');
const SlackClient = require('./slack-client');
const TeamsClient = require('./teams-client');
const NotificationWrapper = require('./notification-wrapper');

class MessagingFactory {
  static create(platform, config, options = {}) {
    let client;
    
    switch (platform.toLowerCase()) {
      case 'pumble':
        client = new PumbleClient(config);
        break;
      
      case 'slack':
        client = new SlackClient(config);
        break;
      
      case 'teams':
        client = new TeamsClient(config);
        break;
      
      case 'discord':
        // Future: return new DiscordClient(config);
        throw new Error('Discord integration not yet implemented');
      
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