const fs = require('fs');
const path = require('path');
require('dotenv').config();
const BotConfig = require('./bot-config');

class ConfigLoader {
  static load() {
    // Load app configuration
    const appConfigPath = path.join(__dirname, '../config/app.json');
    const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
    
    const botIdentity = appConfig.app.defaultBotIdentity || 'bloodhunter';
    const bot = BotConfig.getBotIdentity(botIdentity);
    
    const config = {
      bot: {
        identity: botIdentity,
        ...bot
      },
      messaging: {
        platform: appConfig.app.messagingPlatform || 'pumble',
        pumble: {
          apiKey: bot.apiKey,
          botEmail: bot.email,
          botId: bot.id,
          baseUrl: appConfig.pumble.baseUrl
        },
        channels: this.loadChannels()
      },
      kimai: {
        baseUrl: appConfig.kimai.baseUrl,
        username: process.env.KIMAI_USERNAME,
        password: process.env.KIMAI_PASSWORD
      }
    };

    this.validate(config);
    return config;
  }

  static loadChannels() {
    const channelsPath = path.join(__dirname, '../config/channels.json');
    const channelsData = fs.readFileSync(channelsPath, 'utf8');
    const channels = JSON.parse(channelsData).pumble;
    
    return {
      dev: channels.dev.id,
      design: channels.design.id,
      general: channels.general.id
    };
  }


  static validate(config) {
    const errors = [];

    // Validate Kimai config
    if (!config.kimai.baseUrl) {
      errors.push('KIMAI_URL is required');
    }
    if (!config.kimai.username || !config.kimai.password) {
      errors.push('KIMAI_USERNAME and KIMAI_PASSWORD are required');
    }

    // Validate messaging config
    const platform = config.messaging.platform;
    if (platform === 'pumble') {
      if (!config.messaging.pumble.apiKey) {
        errors.push('PUMBLE_API_KEY is required for Pumble platform');
      }
    } else if (platform === 'slack') {
      if (!config.messaging.slack.token) {
        errors.push('SLACK_BOT_TOKEN is required for Slack platform');
      }
    }

    // Validate channels
    if (!config.messaging.channels.dev && !config.messaging.channels.design) {
      console.warn('No channel IDs configured - bot will not send channel reminders');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }
  }
}

module.exports = ConfigLoader;