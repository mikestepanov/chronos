#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../shared/pumble-client');

async function sendDMToMikhail() {
  try {
    console.log('Sending DM to Mikhail...\n');
    
    const dmChannelId = process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID;
    
    if (!dmChannelId) {
      throw new Error('BOT_TO_MIKHAIL_DM_CHANNEL_ID not found in .env');
    }
    
    console.log(`Using DM channel ID: ${dmChannelId}`);
    
    // Initialize Pumble client
    const pumble = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY,
      botId: process.env.PUMBLE_BOT_ID || '686860a1851f413511ab90ef'
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