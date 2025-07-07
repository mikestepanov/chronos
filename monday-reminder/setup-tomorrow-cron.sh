#!/bin/bash

# Script to set up a one-time cron job for tomorrow morning

echo "📅 Setting up cron job for tomorrow morning..."

# Get tomorrow's date
TOMORROW=$(date -d "tomorrow" +"%Y-%m-%d")

# Create the cron command
CRON_CMD="cd /home/mstepanov/Documents/GitHub/omega && BOT_TO_MIKHAIL_DM_CHANNEL_ID=686860a2851f413511ab90f8 MESSAGING_PLATFORM=pumble KIMAI_URL=https://kimai.starthub.academy KIMAI_API_KEY=dummy PUMBLE_API_KEY=5d2c8b9e37f37d98f60ae4c94a311dd5 /usr/bin/node bots/monday-reminder/monday-reminder.js advance >> /tmp/monday-reminder-test.log 2>&1"

# Add cron entries for tomorrow
(crontab -l 2>/dev/null; echo "# Monday Reminder Test - Remove after ${TOMORROW}") | crontab -
(crontab -l 2>/dev/null; echo "0 6 * * * ${CRON_CMD} && crontab -l | grep -v 'monday-reminder' | crontab -") | crontab -
(crontab -l 2>/dev/null; echo "0 7 * * * cd /home/mstepanov/Documents/GitHub/omega && /usr/bin/node bots/monday-reminder/monday-reminder.js test-preview >> /tmp/monday-reminder-test.log 2>&1 && crontab -l | grep -v 'test-preview' | crontab -") | crontab -

echo "✅ Cron jobs added!"
echo ""
echo "📋 Schedule:"
echo "  6:00 AM - Advance notification to your DM"
echo "  7:00 AM - Preview of main reminder to your DM"
echo ""
echo "These will run ONCE tomorrow and then remove themselves."
echo ""
echo "Current crontab:"
crontab -l | grep -E "(monday-reminder|test-preview)"
echo ""
echo "To remove manually: crontab -e"