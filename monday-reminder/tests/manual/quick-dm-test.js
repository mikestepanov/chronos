#!/usr/bin/env node

const axios = require('axios');
const { format } = require('date-fns');

// Load env from root
require('dotenv').config({ path: '../../.env' });

async function quickDMTest() {
  const apiKey = process.env.AGENTSMITH_API_KEY || '5d2c8b9e37f37d98f60ae4c94a311dd5';
  const mikhailId = process.env.MIKHAIL_PUMBLE_ID || '66908542f1798a06218c1fc5';
  const baseUrl = process.env.PUMBLE_BASE_URL || 'https://api.pumble.com/v1';
  
  console.log('🚀 Quick DM Test\n');
  console.log(`Time: ${format(new Date(), 'h:mm a')} CST`);
  console.log(`API Key: ***${apiKey.slice(-4)}`);
  console.log(`Mikhail ID: ${mikhailId}`);
  console.log(`Base URL: ${baseUrl}\n`);
  
  // Try the direct approach - create a DM and send message
  try {
    console.log('1️⃣ Creating DM channel with Mikhail...');
    
    // Try to create a DM channel
    const createDMResponse = await axios.post(
      `${baseUrl}/users.conversations`, 
      {
        users: mikhailId  // Just the user ID, not an array
      },
      {
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const dmChannel = createDMResponse.data;
    console.log(`✅ DM Channel: ${dmChannel.id}`);
    
    // Send a message
    console.log('\n2️⃣ Sending test message...');
    const messageResponse = await axios.post(
      `${baseUrl}/messages.create`,
      {
        channelId: dmChannel.id,
        text: `🧪 **Quick Test DM**\n\nTime: ${format(new Date(), 'h:mm:ss a')}\n\nIf you see this, the bot is working! ✅`
      },
      {
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Message sent successfully!');
    console.log(`Message ID: ${messageResponse.data.id}`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
    
    // If error, try different approach
    if (error.response?.status === 404) {
      console.log('\nTrying alternative API endpoints...');
      
      // Try the service endpoint
      try {
        const serviceUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
        const testResponse = await axios.post(
          `${serviceUrl}/sendMessage`,
          {
            channelId: '66908bd8f1798a06218c2062', // Common test channel
            text: `Test from Agent Smith - ${format(new Date(), 'h:mm a')}`,
            asBot: true
          },
          {
            headers: { 'Api-Key': apiKey }
          }
        );
        console.log('✅ Alternative endpoint worked!');
      } catch (err) {
        console.error('Alternative also failed:', err.response?.data || err.message);
      }
    }
  }
}

quickDMTest().catch(console.error);