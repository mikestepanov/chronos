#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testPumbleApiKeysService() {
  console.log('🧪 Testing Pumble API Keys Service\n');
  
  const apiKey = process.env.AGENTSMITH_API_KEY;
  const baseUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
  
  console.log(`API Key: ***${apiKey.slice(-4)}`);
  console.log(`Base URL: ${baseUrl}\n`);

  try {
    // Test 1: List channels
    console.log('1️⃣ Testing listChannels endpoint...');
    try {
      const channelsResponse = await axios.get(`${baseUrl}/listChannels`, {
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Successfully connected to API!');
      console.log(`   Found ${channelsResponse.data.length} channels`);
      
      // Show first few channels
      channelsResponse.data.slice(0, 5).forEach(ch => {
        console.log(`   - ${ch.name} (${ch.id})`);
      });
      
      // Look for Mikhail's DM
      const mikhailDM = channelsResponse.data.find(ch => 
        ch.id === process.env.MIKHAIL_DM_CHANNEL_ID
      );
      if (mikhailDM) {
        console.log(`\n   ✅ Found Mikhail's DM channel: ${mikhailDM.name}`);
      }
    } catch (error) {
      console.error('❌ Failed:', error.response?.status, error.response?.data || error.message);
    }

    // Test 2: List users
    console.log('\n2️⃣ Testing users endpoint...');
    try {
      const usersResponse = await axios.get(`${baseUrl}/users`, {
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Successfully fetched users!');
      console.log(`   Found ${usersResponse.data.length} users`);
      
      // Find Mikhail
      const mikhail = usersResponse.data.find(u => 
        u.email === 'mikhail@starthub.academy' || 
        u.id === process.env.MIKHAIL_PUMBLE_ID
      );
      
      if (mikhail) {
        console.log(`\n   ✅ Found Mikhail:`);
        console.log(`   - Name: ${mikhail.name}`);
        console.log(`   - Email: ${mikhail.email}`);
        console.log(`   - ID: ${mikhail.id}`);
      }
    } catch (error) {
      console.error('❌ Failed:', error.response?.status, error.response?.data || error.message);
    }

    // Test 3: Send a test DM to you
    console.log('\n3️⃣ Ready to send a test DM to Mikhail?');
    console.log('   This would send a message to your DM channel.');
    console.log('   Channel ID:', process.env.MIKHAIL_DM_CHANNEL_ID);
    
    // Create test message function
    const sendTestMessage = async () => {
      try {
        const response = await axios.post(`${baseUrl}/sendMessage`, {
          channelId: process.env.MIKHAIL_DM_CHANNEL_ID,
          text: `🤖 **Agent Smith Bot Test**\n\nHello Mikhail! This is a test message from the Agent Smith bot.\n\nTimestamp: ${new Date().toLocaleString()}\n\nThe bot is working correctly! ✅`,
          asBot: true
        }, {
          headers: {
            'Api-Key': apiKey,
            'Content-Type': 'application/json'
          }
        });
        console.log('\n✅ Test message sent successfully!');
        return response.data;
      } catch (error) {
        console.error('\n❌ Failed to send message:', error.response?.data || error.message);
      }
    };

    // Store function for later use
    global.sendTestMessage = sendTestMessage;
    console.log('\n💡 To send a test message, run: sendTestMessage()');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
  }
}

// Run test
testPumbleApiKeysService();

// Keep process alive for REPL
if (process.argv.includes('--interactive')) {
  require('repl').start('> ');
}