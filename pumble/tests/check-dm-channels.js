#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function checkDMChannels() {
  const apiKey = process.env.AGENTSMITH_API_KEY;
  const baseUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
  const mikhailId = process.env.MIKHAIL_PUMBLE_ID;
  const agentSmithId = process.env.AGENTSMITH_ID;
  
  console.log('🔍 Checking DM channels...\n');
  console.log(`Agent Smith ID: ${agentSmithId}`);
  console.log(`Mikhail ID: ${mikhailId}\n`);
  
  try {
    const response = await axios.get(`${baseUrl}/listChannels`, {
      headers: { 'Api-Key': apiKey }
    });
    
    const channels = response.data;
    
    // Filter and display DM channels
    channels.forEach((item, idx) => {
      const ch = item.channel || item;
      
      if (ch.channelType === 'DIRECT') {
        console.log(`\nDM Channel ${idx + 1}:`);
        console.log(`  ID: ${ch.id}`);
        console.log(`  Type: ${ch.channelType}`);
        console.log(`  Users: ${ch.users ? ch.users.join(', ') : 'N/A'}`);
        
        // Check if this is the Mikhail-Agent Smith DM
        if (ch.users && ch.users.includes(mikhailId) && ch.users.includes(agentSmithId)) {
          console.log(`  ✅ THIS IS THE MIKHAIL-AGENT SMITH DM!`);
          
          // Send test message
          console.log('\n📨 Sending test message to this channel...');
          axios.post(`${baseUrl}/sendMessage`, {
            channelId: ch.id,
            text: `🤖 **Agent Smith Bot Test**\n\nHello Mikhail! Found the correct DM channel.\n\nChannel ID: ${ch.id}\n\nTimestamp: ${new Date().toLocaleString()}`,
            asBot: true
          }, {
            headers: { 'Api-Key': apiKey }
          }).then(() => {
            console.log('✅ Message sent successfully!');
            console.log(`\n💡 Update your .env file with:\nMIKHAIL_DM_CHANNEL_ID=${ch.id}`);
          }).catch(err => {
            console.error('❌ Failed to send:', err.response?.data || err.message);
          });
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

checkDMChannels();