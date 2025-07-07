#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function findBotToMikhailDM() {
  const apiKey = process.env.AGENTSMITH_API_KEY;
  const baseUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
  const mikhailId = process.env.MIKHAIL_PUMBLE_ID;
  const agentSmithId = process.env.AGENTSMITH_ID;
  
  console.log('🔍 Finding DM channel between Agent Smith bot and Mikhail...\n');
  console.log(`Agent Smith ID: ${agentSmithId}`);
  console.log(`Mikhail ID: ${mikhailId}\n`);
  
  try {
    // Get all channels
    const response = await axios.get(`${baseUrl}/listChannels`, {
      headers: { 'Api-Key': apiKey }
    });
    
    const channels = response.data;
    
    // Look for direct message channels
    const dmChannels = channels.filter(item => {
      const ch = item.channel || item;
      return ch.channelType === 'DIRECT';
    });
    
    console.log(`Found ${dmChannels.length} DM channels total\n`);
    
    // Try each DM channel to see if we can send to Mikhail
    console.log('Testing DM channels to find the one that reaches Mikhail...\n');
    
    for (const item of dmChannels) {
      const ch = item.channel || item;
      console.log(`Testing channel: ${ch.id}`);
      
      try {
        const testResponse = await axios.post(`${baseUrl}/sendMessage`, {
          channelId: ch.id,
          text: `🔍 **Channel Test**\n\nTesting if this DM channel reaches Mikhail.\n\nChannel ID: ${ch.id}\n\nIf you see this message, please respond!`,
          asBot: true
        }, {
          headers: { 'Api-Key': apiKey }
        });
        
        console.log(`✅ Successfully sent to channel ${ch.id}`);
        console.log(`   This might be the bot-to-Mikhail DM channel!`);
        console.log(`\n💡 Add this to your .env file:`);
        console.log(`BOT_TO_MIKHAIL_DM_CHANNEL_ID=${ch.id}\n`);
        
      } catch (error) {
        console.log(`❌ Failed: ${error.response?.data || error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

findBotToMikhailDM();