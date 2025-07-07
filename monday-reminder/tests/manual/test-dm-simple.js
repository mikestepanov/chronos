#!/usr/bin/env node

/**
 * Simple DM test without full configuration
 * Run: PUMBLE_API_KEY=your-key node test-dm-simple.js
 */

const PumbleClient = require('../shared/pumble-client');
const { format } = require('date-fns');
require('dotenv').config({ path: '../../.env' });

async function testSimpleDM() {
  const apiKey = process.env.PUMBLE_API_KEY || process.env.AGENTSMITH_API_KEY;
  
  if (!apiKey) {
    console.error('❌ No API key found. Set PUMBLE_API_KEY or AGENTSMITH_API_KEY environment variable.');
    process.exit(1);
  }

  console.log('Creating Pumble client...');
  const pumble = new PumbleClient({
    apiKey: apiKey,
    baseUrl: 'https://pumble.com/api/v1'
  });

  // Mikhail's Pumble ID from the config
  const mikhailId = process.env.MIKHAIL_PUMBLE_ID || '66908542f1798a06218c1fc5';
  
  const now = new Date();
  const testMessage = `🧪 **Quick DM Test**

Time: ${format(now, 'h:mm a')} CST
Date: ${format(now, 'MMM d, yyyy')}

This is a simple test to verify the bot can send you DMs.
If you see this, it's working! 🎉`;

  try {
    console.log(`\nSending test DM to Mikhail (ID: ${mikhailId})...`);
    
    // First, try to find or create DM channel
    const channels = await pumble.makeRequest('GET', '/users.conversations', {
      params: { types: 'dm' }
    });
    
    let dmChannel = channels.find(ch => 
      ch.members && ch.members.includes(mikhailId)
    );
    
    if (!dmChannel) {
      console.log('Creating DM channel...');
      dmChannel = await pumble.makeRequest('POST', '/conversations.create', {
        users: [mikhailId]
      });
    }
    
    // Send the message
    await pumble.makeRequest('POST', '/messages.create', {
      channelId: dmChannel.id,
      text: testMessage
    });
    
    console.log('✅ Test DM sent successfully!');
    console.log(`\nMessage sent to channel: ${dmChannel.id}`);
    console.log('Check your Pumble DMs!');
  } catch (error) {
    console.error('❌ Failed to send test DM:', error.message);
    if (error.response) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
if (require.main === module) {
  testSimpleDM().catch(console.error);
}