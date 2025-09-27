#!/usr/bin/env node

/**
 * Send Daily Trivia
 * 
 * This script sends a daily trivia fact to specified channels
 * Completely separate from timesheet reminders
 */

const PumbleClient = require('../shared/pumble-client');
const { createLogger } = require('../shared/logger');
const channels = require('../config/channels.json');
const TriviaService = require('../src/services/triviaService');
require('dotenv').config();

const logger = createLogger('send-daily-trivia');

// Get channel IDs from config
const CHANNELS = {
  dev: channels.pumble.dev.id,
  design: channels.pumble.design.id,
  'bot-testing': channels.pumble.bot_testing.id,
  random: channels.pumble.random.id
};

async function sendDailyTrivia(options = {}) {
  try {
    const triviaService = new TriviaService();
    
    // Get today's trivia
    const trivia = await triviaService.getDailyTrivia();
    
    if (!trivia) {
      logger.warn('No trivia available today');
      console.log('⚠️  No trivia available today');
      return;
    }
    
    // Format trivia message
    const triviaMessage = `💡 **Daily Trivia**\n\n${trivia}`;
    
    logger.info('Sending daily trivia', {
      trivia: trivia.substring(0, 50) + '...'
    });
    
    // Determine target channel
    const channelKey = options.channel || 'bot-testing';
    const channelId = CHANNELS[channelKey];
    
    if (!channelId) {
      throw new Error(`Invalid channel: ${channelKey}. Use 'dev', 'design', 'bot-testing', or 'random'.`);
    }
    
    if (options.dryRun) {
      console.log('\n🔍 DRY RUN - Would send to channel:', channelKey);
      console.log('\nTrivia preview:');
      console.log('─'.repeat(60));
      console.log(triviaMessage);
      console.log('─'.repeat(60));
      return;
    }
    
    // Send message
    const client = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY
    });
    const result = await client.sendMessage(channelId, triviaMessage);
    
    if (result) {
      logger.info('Daily trivia sent successfully', {
        messageId: result.id || 'unknown',
        channel: channelKey
      });
      console.log(`\n✅ Daily trivia sent successfully to ${channelKey} channel!`);
    } else {
      throw new Error('Failed to send message');
    }
    
  } catch (error) {
    logger.error('Failed to send daily trivia', error);
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
Send Daily Trivia

Usage: ./send-daily-trivia.js [options]

Options:
  -c, --channel <name>    Target channel (dev, design, bot-testing, random) [default: bot-testing]
  -d, --dry-run          Preview message without sending
  -h, --help             Show this help message

Examples:
  ./send-daily-trivia.js                  # Send to bot-testing channel
  ./send-daily-trivia.js -c dev          # Send to dev channel
  ./send-daily-trivia.js -d              # Dry run (preview only)
  
This sends a daily trivia fact fetched from various APIs.
`);
        process.exit(0);
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }
  
  sendDailyTrivia(options);
}

module.exports = sendDailyTrivia;