#!/usr/bin/env node

const axios = require('axios');
const { format } = require('date-fns');

// Simple direct test using axios
async function testDirectDM() {
  const apiKey = '5d2c8b9e37f37d98f60ae4c94a311dd5';
  const mikhailId = '66908542f1798a06218c1fc5';
  const baseUrl = 'https://api.pumble.com/v1';
  
  const now = new Date();
  const message = `🧪 **Direct Test Message**

Time: ${format(now, 'h:mm:ss a')} CST
Date: ${format(now, 'EEEE, MMMM d')}

This is a test DM to verify the bot connection.

If you see this, we found the right API endpoint! ✅`;

  console.log('📨 Attempting to send DM to Mikhail...\n');
  
  // Try different API endpoints
  const endpoints = [
    {
      name: 'sendDirectMessage',
      url: `${baseUrl}/sendDirectMessage`,
      body: { userId: mikhailId, text: message, asBot: true }
    },
    {
      name: 'messages.create with DM',
      url: `${baseUrl}/messages.create`,
      body: { userId: mikhailId, text: message }
    },
    {
      name: 'dm.create',
      url: `${baseUrl}/dm.create`,
      body: { user: mikhailId, text: message }
    }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`Trying ${endpoint.name}...`);
    try {
      const response = await axios.post(endpoint.url, endpoint.body, {
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ SUCCESS with ${endpoint.name}!`);
      console.log('Response:', response.data);
      return;
    } catch (error) {
      console.log(`❌ Failed: ${error.response?.status} ${error.response?.statusText || error.message}`);
    }
  }
  
  // If all fail, try the service endpoint
  console.log('\nTrying pumble-api-keys service...');
  try {
    const serviceUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
    
    // First get channels
    const channelsResponse = await axios.get(`${serviceUrl}/listChannels`, {
      headers: { 'Api-Key': apiKey }
    });
    
    console.log(`Found ${channelsResponse.data.length} channels`);
    
    // Find a test channel
    const testChannel = channelsResponse.data.find(ch => 
      ch.name && (ch.name.includes('test') || ch.name.includes('bot'))
    );
    
    if (testChannel) {
      console.log(`Using test channel: ${testChannel.name}`);
      const msgResponse = await axios.post(`${serviceUrl}/sendMessage`, {
        channelId: testChannel.id,
        text: message,
        asBot: true
      }, {
        headers: { 'Api-Key': apiKey }
      });
      console.log('✅ Message sent to test channel!');
    }
  } catch (error) {
    console.log('Service endpoint also failed:', error.message);
  }
}

testDirectDM().catch(console.error);