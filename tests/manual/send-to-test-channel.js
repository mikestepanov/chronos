#!/usr/bin/env node

const PumbleClient = require('../../shared/pumble-client');
const fs = require('fs');
const path = require('path');

async function sendToTestChannel() {
  try {
    console.log('Sending message to bot testing channel...\n');
    
    // Load channel configuration
    const channels = require('../../shared/channels');
const bots = require('../../shared/bots');
    const testChannelId = channels.BOT_TESTING;
    
    console.log(`Bot testing channel ID: ${testChannelId}`);
    
    // Initialize Pumble client
    const pumbleClient = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY,
      botId: require('../../shared/bots').DEFAULT_BOT_ID
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