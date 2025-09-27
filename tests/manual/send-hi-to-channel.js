#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../../shared/pumble-client');

async function sendHi() {
  try {
    console.log('Sending "hi" via Pumble...\n');
    
    // Initialize Pumble client
    const pumble = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY,
      botId: require('../../shared/bots').DEFAULT_BOT_ID
    });
    
    // Get bot testing channel from config
    const fs = require('fs');
    const path = require('path');
    const channels = require('../../shared/channels');
const bots = require('../../shared/bots');
    const testChannelId = channels.BOT_TESTING;
    
    console.log(`Sending to bot testing channel: ${testChannelId}`);
    
    // Send message
    const result = await pumble.sendMessage(testChannelId, 'hi', false);
    
    console.log('✅ Message sent successfully!');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Run
sendHi();