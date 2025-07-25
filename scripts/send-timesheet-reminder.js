#!/usr/bin/env node

/**
 * Send Timesheet Reminder
 * 
 * This script sends a reminder about the current pay period approaching its end
 * Perfect for sending a few days before the period ends
 */

const PayPeriodCalculator = require('../shared/pay-period-calculator');
const PumbleClient = require('../shared/pumble-client');
const { createLogger } = require('../shared/logger');
const channels = require('../config/channels.json');
require('dotenv').config();

const logger = createLogger('send-timesheet-reminder');

// Get channel IDs from config
const CHANNELS = {
  dev: channels.pumble.dev.id,
  design: channels.pumble.design.id,
  'bot-testing': channels.pumble.bot_testing.id,
  random: channels.pumble.random.id
};

async function sendTimesheetReminder(options = {}) {
  try {
    const calculator = new PayPeriodCalculator();
    
    // Generate the reminder message
    const reminderMessage = calculator.generateReminderMessage();
    
    // Get current period info for logging
    const currentPeriod = calculator.getCurrentPayPeriod();
    const daysRemaining = calculator.getDaysUntilPeriodEnd();
    
    logger.info('Sending timesheet reminder', {
      periodNumber: currentPeriod.number,
      daysRemaining,
      endDate: currentPeriod.end.toISOString().split('T')[0]
    });
    
    // Determine target channel
    const channelKey = options.channel || 'bot-testing';
    const channelId = CHANNELS[channelKey];
    
    if (!channelId) {
      throw new Error(`Invalid channel: ${channelKey}. Use 'dev', 'design', 'bot-testing', or 'random'.`);
    }
    
    if (options.dryRun) {
      console.log('\n🔍 DRY RUN - Would send to channel:', channelKey);
      console.log(`   Pay Period: ${currentPeriod.number}`);
      console.log(`   Days Remaining: ${daysRemaining}`);
      console.log('\nMessage preview:');
      console.log('─'.repeat(60));
      console.log(reminderMessage);
      console.log('─'.repeat(60));
      return;
    }
    
    // Send message
    const client = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY
    });
    const result = await client.sendMessage(channelId, reminderMessage);
    
    if (result) {
      logger.info('Timesheet reminder sent successfully', {
        messageId: result.id || 'unknown',
        channel: channelKey
      });
      console.log(`\n✅ Timesheet reminder sent successfully to ${channelKey} channel!`);
      console.log(`   Pay Period: ${currentPeriod.number}`);
      console.log(`   Days Remaining: ${daysRemaining}`);
    } else {
      throw new Error('Failed to send message');
    }
    
  } catch (error) {
    logger.error('Failed to send timesheet reminder', error);
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--channel':
      case '-c':
        options.channel = args[++i];
        break;
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Send Timesheet Reminder

Usage: ./send-timesheet-reminder.js [options]

Options:
  -c, --channel <name>    Target channel (dev, design, bot-testing, random) [default: bot-testing]
  -d, --dry-run          Preview message without sending
  -h, --help             Show this help message

Examples:
  ./send-timesheet-reminder.js                  # Send to bot-testing channel
  ./send-timesheet-reminder.js -c dev          # Send to dev channel
  ./send-timesheet-reminder.js -d              # Dry run (preview only)
  
This sends the standard timesheet reminder for the current pay period.
`);
        process.exit(0);
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }
  
  sendTimesheetReminder(options);
}

module.exports = sendTimesheetReminder;