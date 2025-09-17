#!/usr/bin/env node

const ChannelManager = require('../services/ChannelManager');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

/**
 * Send a message to users - handles channel creation/finding automatically
 * 
 * Usage:
 *   node send-message.js "message text" user1_id [user2_id ...]
 *   
 * Examples:
 *   # Send DM to one user
 *   node send-message.js "Hello!" 66908542f1798a06218c1fc5
 *   
 *   # Create/find 3-way chat (bot + 2 users)
 *   node send-message.js "Meeting reminder" user1_id user2_id
 *   
 *   # Create/find 4-way chat (bot + 3 users)
 *   node send-message.js "Team update" user1_id user2_id user3_id
 */
async function sendMessage(message, userIds) {
  // Configuration from environment
  const config = {
    apiToken: process.env.PUMBLE_API_TOKEN || process.env.AGENTSMITH_API_KEY,
    botId:  require('../../shared/bots').DEFAULT_BOT_ID,
    botName: process.env.BOT_NAME || 'Agent Smith',
    workspaceId: process.env.PUMBLE_WORKSPACE_ID
  };

  if (!config.apiToken) {
    console.error('❌ Error: No API token found');
    console.error('Set PUMBLE_API_TOKEN or AGENTSMITH_API_KEY in .env file');
    process.exit(1);
  }

  const channelManager = new ChannelManager(config);

  try {
    console.log(`\n🤖 ${config.botName} Message Sender`);
    console.log('=' .repeat(50));
    
    let channel;
    let channelType;

    if (userIds.length === 1) {
      // Single user - create/find DM
      console.log(`\n📱 Finding DM channel with user ${userIds[0]}...`);
      const channelId = await channelManager.getDMChannel(userIds[0]);
      channel = { id: channelId };
      channelType = 'DM';
      
    } else {
      // Multiple users - create/find group channel
      console.log(`\n👥 Finding group channel with ${userIds.length} users...`);
      console.log(`   Users: ${userIds.join(', ')}`);
      
      // Generate a descriptive name based on number of participants
      const channelName = `chat-${userIds.length + 1}-way-${Date.now()}`;
      
      channel = await channelManager.getGroupChannel(userIds, channelName);
      channelType = `${userIds.length + 1}-way chat`;
    }

    console.log(`✅ Channel found/created: ${channel.id}`);
    console.log(`   Type: ${channelType}`);
    if (channel.name) {
      console.log(`   Name: ${channel.name}`);
    }

    // Send the message
    console.log(`\n📤 Sending message...`);
    console.log(`   Message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);
    
    const result = await channelManager.sendMessage(channel.id, message);
    
    console.log(`✅ Message sent successfully!`);
    if (result.id) {
      console.log(`   Message ID: ${result.id}`);
    }
    if (result.timestamp) {
      console.log(`   Timestamp: ${new Date(result.timestamp).toISOString()}`);
    }

    // Cache status
    console.log(`\n📊 Cache Status:`);
    console.log(`   Channels cached: ${channelManager.channelCache.size}`);
    console.log(`   Users cached: ${channelManager.userCache.size}`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    
    if (error.response) {
      console.error('\nAPI Response Details:');
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }

    process.exit(1);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
Kimai Message Sender - Send messages via Pumble bot

Usage: 
  node send-message.js "message text" user_id [user_id2 ...]

Arguments:
  message    The message to send (in quotes)
  user_id    Pumble user ID(s) to send to

Examples:
  # Send DM to Mikhail
  node send-message.js "Hello Mikhail!" 66908542f1798a06218c1fc5
  
  # Create 3-way chat (bot + Mikhail + another user)
  node send-message.js "Compliance check" 66908542f1798a06218c1fc5 other_user_id
  
  # Send to multiple users (creates group chat)
  node send-message.js "Team meeting at 3pm" user1 user2 user3

Special user IDs from .env:
  Mikhail: 66908542f1798a06218c1fc5
  Bot: 686860a1851f413511ab90ef
`);
    process.exit(0);
  }

  const message = args[0];
  const userIds = args.slice(1);

  return { message, userIds };
}

// Main execution
if (require.main === module) {
  const { message, userIds } = parseArgs();
  sendMessage(message, userIds);
}

module.exports = sendMessage;