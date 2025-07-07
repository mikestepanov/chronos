#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testSpecificChannel() {
  const apiKey = process.env.AGENTSMITH_API_KEY;
  const baseUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
  
  // Try different possible channel IDs
  const channelIds = [
    process.env.MIKHAIL_DM_CHANNEL_ID,  // Original from .env
    process.env.AGENTSMITH_DM_CHANNEL_ID,  // Agent Smith's DM channel
    '686860a2851f413511ab90f8',  // First DM found
    '686860cedbc3a374fe8dc3fc',  // Second DM found
  ];
  
  console.log('🧪 Testing different channel IDs...\n');
  
  for (const channelId of channelIds) {
    if (!channelId) continue;
    
    console.log(`\nTesting channel: ${channelId}`);
    
    try {
      const response = await axios.post(`${baseUrl}/sendMessage`, {
        channelId: channelId,
        text: `🤖 **Test Message**\n\nTesting channel ID: ${channelId}\n\nTime: ${new Date().toLocaleTimeString()}`,
        asBot: true
      }, {
        headers: { 'Api-Key': apiKey }
      });
      
      console.log(`✅ SUCCESS! Message sent to channel ${channelId}`);
      console.log('Response:', response.data);
      
      // If successful, this is likely the right channel
      console.log('\n💡 Use this channel ID for sending messages to Mikhail');
      break;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.response?.data || error.message}`);
    }
  }
}

testSpecificChannel();