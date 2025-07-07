#!/usr/bin/env node

const axios = require('axios');

async function debugChannels() {
  const apiKey = process.env.AGENTSMITH_API_KEY || '5d2c8b9e37f37d98f60ae4c94a311dd5';
  const serviceUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
  
  try {
    const response = await axios.get(`${serviceUrl}/listChannels`, {
      headers: { 'Api-Key': apiKey }
    });
    
    console.log('Raw response sample:');
    console.log(JSON.stringify(response.data.slice(0, 3), null, 2));
    
    // Check structure
    const firstItem = response.data[0];
    if (firstItem) {
      console.log('\nFirst item keys:', Object.keys(firstItem));
      
      // If it has a channel property
      if (firstItem.channel) {
        console.log('Channel keys:', Object.keys(firstItem.channel));
      }
    }
    
    // Try to find channels with proper structure
    const channelsWithNames = response.data.filter(item => {
      const ch = item.channel || item;
      return ch.name || ch.channelName;
    });
    
    console.log(`\nChannels with names: ${channelsWithNames.length}`);
    channelsWithNames.slice(0, 5).forEach(item => {
      const ch = item.channel || item;
      console.log(`- ${ch.name || ch.channelName} (${ch.id || ch.channelId})`);
    });
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

debugChannels();