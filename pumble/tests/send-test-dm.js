#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../shared/pumble-client');

async function sendTestDM() {
  const pumble = new PumbleClient({
    apiKey: process.env.AGENTSMITH_API_KEY,
    botEmail: process.env.AGENTSMITH_EMAIL,
    botId: process.env.AGENTSMITH_ID
  });

  const mikhailDmChannelId = process.env.MIKHAIL_DM_CHANNEL_ID;
  
  console.log('📨 Sending test DM to Mikhail...');
  console.log(`Channel ID: ${mikhailDmChannelId}`);
  
  try {
    const result = await pumble.sendMessage(
      mikhailDmChannelId,
      `🤖 **Agent Smith Bot Test**\n\nHello Mikhail! The Pumble API is working correctly.\n\nTimestamp: ${new Date().toLocaleString()}\n\n✅ Bot is ready for use!`,
      true // Send as bot
    );
    
    console.log('✅ Message sent successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Failed to send message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

sendTestDM();