# Configuration Guide

## Overview

Chronos uses JSON configuration files for all settings except sensitive credentials. This approach makes the system easy to customize without modifying code.

## Configuration Files

### app.json

General application settings and metadata.

```json
{
  "app": {
    "name": "Chronos Timesheet Bot",
    "version": "2.0.0",
    "defaultBotIdentity": "agentsmith",
    "messagingPlatform": "pumble"
  },
  "kimai": {
    "baseUrl": "https://kimai.starthub.academy",
    "exportPath": "./exports",
    "exportFormat": "csv"
  },
  "browser": {
    "defaultType": "firefox",
    "headless": true,
    "timeout": 30000
  }
}
```

**Fields:**
- `defaultBotIdentity` - Which bot from bots.json to use
- `messagingPlatform` - Platform for messaging (pumble/slack/discord)
- `kimai.baseUrl` - Your Kimai instance URL
- `browser.defaultType` - Browser for automation (firefox/chromium)

### bots.json

Bot identities and configurations.

```json
{
  "bots": {
    "agentsmith": {
      "name": "Agent Smith",
      "email": "smith@example.com",
      "id": "66908542f1798a06218c1fc5",
      "apiKey": "${PUMBLE_API_KEY}",
      "avatar": "https://example.com/avatar.png"
    },
    "testbot": {
      "name": "Test Bot",
      "email": "test@example.com",
      "id": "12345678901234567890",
      "apiKey": "${PUMBLE_TEST_API_KEY}"
    }
  }
}
```

**Note:** API keys use `${VAR_NAME}` syntax to reference environment variables.

### channels.json

Channel mappings for different platforms.

```json
{
  "pumble": {
    "general": {
      "id": "C01234567890ABCDEF01",
      "name": "general",
      "description": "General discussion",
      "notify": true
    },
    "dev": {
      "id": "C01234567890ABCDEF02",
      "name": "dev",
      "description": "Development team",
      "notify": true
    },
    "design": {
      "id": "C01234567890ABCDEF03",
      "name": "design",
      "description": "Design team",
      "notify": true
    },
    "bot-testing": {
      "id": "C01234567890ABCDEF04",
      "name": "bot_testing",
      "description": "Bot testing channel",
      "notify": false
    }
  },
  "slack": {
    "_comment": "Future Slack integration"
  }
}
```

**Finding Channel IDs:**
1. In Pumble, right-click channel
2. Copy link
3. Extract ID from URL

### users/users.json

Team member directory with service mappings.

```json
{
  "users": [
    {
      "id": "john-doe",
      "name": "John Doe",
      "username": "jdoe",
      "email": "john@example.com",
      "active": true,
      "type": "fullTime",
      "hoursExpected": 80,
      "services": {
        "pumble": {
          "id": "U01234567890ABCDEF",
          "username": "john.doe"
        },
        "kimai": {
          "username": "jdoe@example.com"
        }
      },
      "preferences": {
        "reminderTime": "9:00",
        "timezone": "America/Chicago"
      }
    },
    {
      "id": "jane-smith",
      "name": "Jane Smith",
      "username": "jsmith",
      "email": "jane@example.com",
      "active": true,
      "type": "partTime",
      "hoursExpected": 40,
      "services": {
        "pumble": {
          "id": "U09876543210FEDCBA",
          "username": "jane.smith"
        },
        "kimai": {
          "username": "jane@example.com"
        }
      }
    }
  ],
  "types": {
    "fullTime": {
      "hoursPerPeriod": 80,
      "daysPerPeriod": 10
    },
    "partTime": {
      "hoursPerPeriod": 40,
      "daysPerPeriod": 5
    },
    "contractor": {
      "hoursPerPeriod": null,
      "daysPerPeriod": null
    }
  }
}
```

**Important Fields:**
- `active` - Set to false to exclude from reminders
- `type` - Employment type for hours calculation
- `hoursExpected` - Override default hours for user
- `services.kimai.username` - Must match Kimai exactly

### message-templates.json

Reusable message templates with variables.

```json
{
  "templates": {
    "timesheet-reminder": {
      "description": "Standard timesheet reminder",
      "template": "Hi {{name}}! 👋\n\nYou've logged {{hoursLogged}}/{{hoursExpected}} hours for the current pay period.\n\nPlease update your timesheet in Kimai if needed.",
      "variables": ["name", "hoursLogged", "hoursExpected"]
    },
    "incomplete-timesheet": {
      "description": "Reminder for incomplete timesheets",
      "template": "Hello {{name}},\n\nOur records show you've only logged {{hoursLogged}} hours this pay period (expected: {{hoursExpected}}).\n\nThe pay period ends {{deadline}}. Please update your timesheet.",
      "variables": ["name", "hoursLogged", "hoursExpected", "deadline"]
    },
    "pay-period-summary": {
      "description": "End of pay period summary",
      "template": "📊 Pay Period #{{period}} Summary\n\nDate Range: {{dateRange}}\nTotal Hours: {{totalHours}}\nTeam Average: {{avgHours}}\n\nThank you for submitting your timesheets!",
      "variables": ["period", "dateRange", "totalHours", "avgHours"]
    }
  },
  "presets": {
    "weekly-reminder": {
      "template": "timesheet-reminder",
      "values": {
        "hoursExpected": "80"
      }
    },
    "urgent-reminder": {
      "template": "incomplete-timesheet",
      "values": {
        "deadline": "today by 5 PM"
      }
    }
  },
  "dynamicVariables": [
    {
      "name": "currentPeriod",
      "description": "Current pay period number"
    },
    {
      "name": "currentDateRange",
      "description": "Current period date range"
    },
    {
      "name": "today",
      "description": "Today's date formatted"
    },
    {
      "name": "timestamp",
      "description": "Current ISO timestamp"
    }
  ]
}
```

### compliance.json

Rules and thresholds for compliance checking.

```json
{
  "hours": {
    "toleranceHours": 3,
    "warningThreshold": 0.9,
    "criticalThreshold": 0.75,
    "overtimeThreshold": 1.1
  },
  "notifications": {
    "sendWarnings": true,
    "warningDaysBefore": 2,
    "escalateToManager": false,
    "managerEscalationThreshold": 0.5
  },
  "reporting": {
    "includeInactive": false,
    "showPercentages": true,
    "roundHours": true,
    "groupByTeam": true
  }
}
```

## Environment Variables

Only sensitive data in `.env`:

```env
# API Keys (required)
PUMBLE_API_KEY=your-pumble-api-key-here

# Kimai Credentials (required)
KIMAI_USERNAME=admin@example.com
KIMAI_PASSWORD=your-secure-password

# Optional
WEBHOOK_SECRET=your-webhook-secret
MIKHAIL_PUMBLE_ID=specific-user-id
BOT_TO_MIKHAIL_DM_CHANNEL_ID=dm-channel-id
```

## Configuration Loading

The system uses a centralized config loader:

```javascript
const ConfigLoader = require('./shared/config-loader');
const config = ConfigLoader.load();

// Access configuration
console.log(config.app.name);
console.log(config.channels.pumble.dev);
```

## Scheduling

### Cron Configuration

Example crontab entries:

```bash
# Kimai data pull - Daily at 8 AM
0 8 * * * cd /path/to/chronos && npm run pull-kimai

# Monday reminders - 7 AM CST on Mondays
0 7 * * 1 cd /path/to/chronos && node monday-reminder/monday-reminder.js run

# Follow-up reminders - Fridays at 3 PM
0 15 * * 5 cd /path/to/chronos && node cronjobs/followup-reminder.js

# Advance notifications - 1 hour before reminders
0 6 * * 1 cd /path/to/chronos && node monday-reminder/monday-reminder.js advance
```

### Systemd Timer

Alternative to cron using systemd:

```ini
# /etc/systemd/system/chronos-kimai.timer
[Unit]
Description=Pull Kimai data daily

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/chronos-kimai.service
[Unit]
Description=Pull Kimai timesheet data

[Service]
Type=oneshot
User=chronos
WorkingDirectory=/path/to/chronos
ExecStart=/usr/bin/npm run pull-kimai
```

## Advanced Configuration

### Multi-Environment Setup

Use different configs per environment:

```javascript
// config/app.development.json
{
  "app": {
    "name": "Chronos Dev",
    "messagingPlatform": "pumble"
  },
  "kimai": {
    "baseUrl": "https://kimai-dev.example.com"
  }
}

// config/app.production.json
{
  "app": {
    "name": "Chronos",
    "messagingPlatform": "pumble"
  },
  "kimai": {
    "baseUrl": "https://kimai.example.com"
  }
}
```

Load based on NODE_ENV:
```javascript
const env = process.env.NODE_ENV || 'development';
const config = require(`./config/app.${env}.json`);
```

### Custom Pay Periods

Override default 14-day periods:

```json
{
  "payPeriods": {
    "type": "custom",
    "periods": [
      {
        "number": 20,
        "start": "2024-12-24",
        "end": "2025-01-06",
        "payment": "2025-01-13"
      },
      {
        "number": 21,
        "start": "2025-01-07",
        "end": "2025-01-20",
        "payment": "2025-01-27"
      }
    ]
  }
}
```

### Feature Flags

Enable/disable features:

```json
{
  "features": {
    "mondayReminders": true,
    "followupReminders": true,
    "autoEscalation": false,
    "groupDMReminders": true,
    "complianceReports": true,
    "apiEndpoints": false
  }
}
```

## Validation

The config loader validates required fields:

```javascript
// shared/config-loader.js
validateConfig(config) {
  if (!config.app?.name) {
    throw new Error('app.name is required');
  }
  
  if (!config.kimai?.baseUrl) {
    throw new Error('kimai.baseUrl is required');
  }
  
  // Validate each user has required fields
  config.users?.users?.forEach(user => {
    if (!user.id || !user.name) {
      throw new Error(`User missing required fields: ${JSON.stringify(user)}`);
    }
  });
}
```

## Best Practices

1. **Version Control**: Commit config changes with descriptive messages
2. **No Secrets**: Never put passwords or API keys in JSON files
3. **Documentation**: Add `_comment` fields to explain complex configs
4. **Validation**: Test config changes before deploying
5. **Backup**: Keep backups of working configurations