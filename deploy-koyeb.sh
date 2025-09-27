#!/bin/bash

# Load environment variables
source .env

# Check if KOYEB_API_KEY is set
if [ -z "$KOYEB_API_KEY" ]; then
    echo "❌ Error: KOYEB_API_KEY not found in .env file"
    exit 1
fi

echo "🚀 Deploying Chronos Cron Server to Koyeb..."

# Use Koyeb CLI to create the app
curl -X POST https://app.koyeb.com/v1/apps \
  -H "Authorization: Bearer $KOYEB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "chronos-bot",
    "domains": [
      {
        "name": "chronos-bot.koyeb.app"
      }
    ]
  }'

# Create the service
curl -X POST https://app.koyeb.com/v1/services \
  -H "Authorization: Bearer $KOYEB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "chronos-bot",
    "definition": {
      "name": "cron-server",
      "type": "web",
      "git": {
        "repository": "github.com/mikestepanov/chronos",
        "branch": "first",
        "build_command": "npm install",
        "run_command": "node koyeb-cron-server.js"
      },
      "env": [
        {
          "key": "PUMBLE_API_KEY",
          "value": "'"$PUMBLE_API_KEY"'",
          "secret": true
        },
        {
          "key": "ENABLE_TEST_REMINDER",
          "value": "true"
        },
        {
          "key": "ENABLE_MONDAY_REMINDER",
          "value": "true"
        },
        {
          "key": "WEBHOOK_SECRET",
          "value": "'"${WEBHOOK_SECRET:-$(openssl rand -hex 32)}"'",
          "secret": true
        },
        {
          "key": "NODE_ENV",
          "value": "production"
        },
        {
          "key": "PORT",
          "value": "3000"
        }
      ],
      "ports": [
        {
          "port": 3000,
          "protocol": "http"
        }
      ],
      "routes": [
        {
          "path": "/",
          "port": 3000
        }
      ],
      "health_checks": [
        {
          "http": {
            "path": "/health",
            "port": 3000
          },
          "interval": "60s"
        }
      ],
      "regions": ["was"],
      "instance_types": [
        {
          "type": "free"
        }
      ],
      "scaling": {
        "min": 1,
        "max": 1
      }
    }
  }'

echo "✅ Deployment initiated!"
echo "🌐 Your app will be available at: https://chronos-bot.koyeb.app"
echo "📊 Check status at: https://app.koyeb.com/apps/chronos-bot"