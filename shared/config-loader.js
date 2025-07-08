const fs = require('fs');
const path = require('path');
require('dotenv').config();
const BotConfig = require('./bot-config');

class ConfigLoader {
  static load() {
    const botIdentity = process.env.BOT_IDENTITY || 'bloodhunter';
    const bot = BotConfig.getBotIdentity(botIdentity);
    
    const config = {
      bot: {
        identity: botIdentity,
        ...bot
      },
      messaging: {
        platform: process.env.MESSAGING_PLATFORM || 'pumble',
        pumble: {
          apiKey: bot.apiKey,
          botEmail: bot.email,
          botId: bot.id
        },
        channels: this.loadChannels()
      },
      kimai: {
        baseUrl: process.env.KIMAI_URL,
        apiKey: process.env.KIMAI_API_KEY,
        username: process.env.KIMAI_USERNAME,
        password: process.env.KIMAI_PASSWORD
      },
      payPeriod: {
        days: parseInt(process.env.PAY_PERIOD_DAYS || '14'),
        minHoursExpected: parseInt(process.env.MIN_HOURS_EXPECTED || '70'),
        minDaysExpected: parseInt(process.env.MIN_DAYS_EXPECTED || '10'),
        reminderDaysBefore: parseInt(process.env.REMINDER_DAYS_BEFORE || '2')
      },
      employees: this.loadEmployeeMapping(),
      managerEmail: process.env.MANAGER_EMAIL // Your email for oversight
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

  static loadEmployeeMapping() {
    const mapping = {};
    const envMapping = process.env.EMPLOYEE_MAPPING;
    
    if (envMapping) {
      // Format: email:id,email:id
      envMapping.split(',').forEach(pair => {
        const [email, id] = pair.trim().split(':');
        if (email && id) {
          mapping[email] = id;
        }
      });
    }

    // Also check for JSON file
    const jsonPath = path.join(__dirname, '../employee-mapping.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const jsonMapping = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        Object.assign(mapping, jsonMapping);
      } catch (error) {
        console.warn('Failed to load employee-mapping.json:', error.message);
      }
    }

    return mapping;
  }

  static validate(config) {
    const errors = [];

    // Validate Kimai config
    if (!config.kimai.baseUrl) {
      errors.push('KIMAI_URL is required');
    }
    if (!config.kimai.apiKey && (!config.kimai.username || !config.kimai.password)) {
      errors.push('Either KIMAI_API_KEY or KIMAI_USERNAME/PASSWORD is required');
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