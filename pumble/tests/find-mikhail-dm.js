#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function findMikhailDM() {
  const apiKey = process.env.AGENTSMITH_API_KEY;
  const baseUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
  
  console.log('🔍 Finding Mikhail\'s DM channel...\n');
  
  try {
    // Get all channels
    const response = await axios.get(`${baseUrl}/listChannels`, {
      headers: { 'Api-Key': apiKey }
    });
    
    const channels = response.data;
    console.log(`Found ${channels.length} total channels\n`);
    
    // Look for DM channels
    const dmChannels = channels.filter(item => {
      const ch = item.channel || item;
      return ch.channelType === 'DIRECT' || ch.channelType === 'DM' || ch.isDirect;
    });
    
    console.log(`Found ${dmChannels.length} DM channels:`);
    
    // Get users to match DM channels
    console.log('\n🔍 Getting user list to match DMs...');
    const usersResponse = await axios.get(`${baseUrl}/listUsers`, {
      headers: { 'Api-Key': apiKey }
    });
    
    const users = usersResponse.data || [];
    const mikhail = users.find(u => 
      u.email === 'mikhail@starthub.academy' || 
      u.id === process.env.MIKHAIL_PUMBLE_ID ||
      (u.name && u.name.toLowerCase().includes('mikhail'))
    );
    
    if (mikhail) {
      console.log(`\n✅ Found Mikhail: ${mikhail.name} (${mikhail.id})`);
      
      // Find DM channel with Mikhail
      const mikhailDM = dmChannels.find(item => {
        const ch = item.channel || item;
        return ch.users && ch.users.includes(mikhail.id);
      });
      
      if (mikhailDM) {
        const channelId = (mikhailDM.channel || mikhailDM).id;
        console.log(`\n✅ Found Mikhail's DM channel: ${channelId}`);
        
        // Test sending a message
        console.log('\n📨 Sending test message...');
        const messageResponse = await axios.post(`${baseUrl}/sendMessage`, {
          channelId: channelId,
          text: `🤖 **Agent Smith Bot**\n\nHello Mikhail! I found your DM channel.\n\nChannel ID: ${channelId}\n\nThe bot is working! ✅`,
          asBot: true
        }, {
          headers: { 'Api-Key': apiKey }
        });
        
        console.log('✅ Message sent successfully!');
        console.log('\n💡 Update your .env file:');
        console.log(`MIKHAIL_DM_CHANNEL_ID=${channelId}`);
      }
    } else {
      console.log('❌ Could not find Mikhail in user list');
      
      // Show all DM channels for manual selection
      console.log('\n📋 All DM channels:');
      dmChannels.forEach((item, idx) => {
        const ch = item.channel || item;
        console.log(`${idx + 1}. Channel ID: ${ch.id}`);
        if (ch.users) {
          console.log(`   Users: ${ch.users.join(', ')}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

findMikhailDM();