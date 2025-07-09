#!/usr/bin/env node

const PumbleClient = require('../shared/pumble-client');
const fs = require('fs');
const path = require('path');

async function sendToTestChannel() {
  try {
    console.log('Sending message to bot testing channel...\n');
    
    // Load channel configuration
    const channelsPath = path.join(__dirname, '../config/channels.json');
    const channelsData = fs.readFileSync(channelsPath, 'utf8');
    const channels = JSON.parse(channelsData).pumble;
    const testChannelId = channels.bot_testing.id;
    
    console.log(`Bot testing channel ID: ${testChannelId}`);
    
    // Initialize Pumble client
    const pumbleClient = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY,
      botId: process.env.PUMBLE_BOT_ID || '686860a1851f413511ab90ef'
    });
    
    // Send message to channel
    console.log('Sending message...');
    await pumbleClient.sendMessage(testChannelId, 'hi', false);
    
    console.log('✅ Message sent to bot testing channel!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', error.response.data);
    }
  }
}

// Run
if (require.main === module) {
  sendToTestChannel();
}