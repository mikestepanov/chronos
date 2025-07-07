#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config();

/**
 * Test Pumble connection and message sending
 */
async function testPumbleConnection() {
  console.log('🧪 Testing Pumble Connection\n');
  
  const config = {
    apiToken: process.env.PUMBLE_API_TOKEN || process.env.AGENTSMITH_API_KEY,
    botId: process.env.PUMBLE_BOT_USER_ID || '686860a1851f413511ab90ef',
    adminId: process.env.PUMBLE_ADMIN_USER_ID || '66908542f1798a06218c1fc5',
    adminDmChannel: process.env.PUMBLE_ADMIN_DM_CHANNEL || '669089ad1e6b0b63f79f9fa4',
    baseUrl: process.env.PUMBLE_BASE_URL || 'https://api.pumble.com/v1'
  };
  
  console.log('Configuration:');
  console.log(`- Bot ID: ${config.botId}`);
  console.log(`- Admin ID: ${config.adminId}`);
  console.log(`- Admin DM Channel: ${config.adminDmChannel}`);
  console.log(`- API Token: ${config.apiToken ? '***' + config.apiToken.slice(-4) : 'NOT SET'}`);
  
  if (!config.apiToken) {
    console.error('\n❌ Error: PUMBLE_API_TOKEN or AGENTSMITH_API_KEY not set');
    process.exit(1);
  }
  
  try {
    // Test 1: Send a direct message to Mikhail
    console.log('\n📨 Test 1: Sending test message to Mikhail\'s DM...');
    
    const message = {
      channel_id: config.adminDmChannel,
      text: `🧪 **Kimai Bot Test Message**\n\nThis is a test from the Kimai compliance bot.\n\nTimestamp: ${new Date().toISOString()}\n\nIf you see this, the bot can successfully send messages to your DM channel!`
    };
    
    const response = await axios.post(
      `${config.baseUrl}/messages`,
      message,
      {
        headers: {
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 200 || response.status === 201) {
      console.log('✅ Message sent successfully!');
      console.log(`   Message ID: ${response.data.id || 'N/A'}`);
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}`);
    }
    
    // Test 2: Test @mention format
    console.log('\n📨 Test 2: Testing @mention format...');
    
    const mentionMessage = {
      channel_id: config.adminDmChannel,
      text: `Testing mention formats:\n\n1. Direct @mention: <@${config.adminId}>\n2. Bot mention: <@${config.botId}>\n3. Text mention: @Agent Smith\n\nPlease reply with "@Agent Smith done" to test mention detection.`
    };
    
    const mentionResponse = await axios.post(
      `${config.baseUrl}/messages`,
      mentionMessage,
      {
        headers: {
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (mentionResponse.status === 200 || mentionResponse.status === 201) {
      console.log('✅ Mention test message sent!');
    }
    
    // Test 3: List channels to verify access
    console.log('\n📋 Test 3: Listing accessible channels...');
    
    const channelsResponse = await axios.get(
      `${config.baseUrl}/channels`,
      {
        headers: {
          'Authorization': `Bearer ${config.apiToken}`
        }
      }
    );
    
    if (channelsResponse.data && channelsResponse.data.length > 0) {
      console.log(`✅ Bot has access to ${channelsResponse.data.length} channels`);
      
      // Check if we can see the admin DM channel
      const adminChannel = channelsResponse.data.find(ch => ch.id === config.adminDmChannel);
      if (adminChannel) {
        console.log(`   ✓ Admin DM channel found: ${adminChannel.name || 'Direct Message'}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('\nResponse details:');
      console.error(`- Status: ${error.response.status}`);
      console.error(`- Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
    }
    
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Verify API token is correct');
    console.log('2. Check if bot has permission to send messages');
    console.log('3. Verify channel IDs are correct');
    console.log('4. Check Pumble API documentation for correct endpoint format');
  }
}

// Run test
if (require.main === module) {
  testPumbleConnection();
}

module.exports = testPumbleConnection;