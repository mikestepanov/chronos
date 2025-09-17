#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../../shared/pumble-client');

async function sendDMToMikhail() {
  try {
    console.log('Sending DM to Mikhail...\n');
    
    const dmChannelId = require('../../shared/channels').BOT_TO_MIKHAIL;
    
    if (!dmChannelId) {
      throw new Error('bot_to_mikhail channel not configured');
    }
    
    console.log(`Using DM channel ID: ${dmChannelId}`);
    
    // Initialize Pumble client
    const pumble = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY,
      botId: require('../../shared/bots').DEFAULT_BOT_ID
    });
    
    // Send message
    const result = await pumble.sendMessage(dmChannelId, 'hi', false);
    
    console.log('✅ DM sent successfully!');
    console.log('Message ID:', result.id);
    console.log('Timestamp:', result.timestamp);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Run
sendDMToMikhail();