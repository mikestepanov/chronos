#!/usr/bin/env node

const ChannelManager = require('../services/ChannelManager');
require('dotenv').config();

/**
 * Test Channel Manager functionality
 */
async function testChannelManager() {
  console.log('🧪 Testing Channel Manager\n');
  
  const config = {
    apiToken: process.env.PUMBLE_API_TOKEN || process.env.AGENTSMITH_API_KEY,
    botId: process.env.PUMBLE_BOT_USER_ID || '686860a1851f413511ab90ef',
    workspaceId: process.env.PUMBLE_WORKSPACE_ID
  };
  
  if (!config.apiToken) {
    console.error('❌ No API token found. Set PUMBLE_API_TOKEN or AGENTSMITH_API_KEY');
    process.exit(1);
  }
  
  const channelManager = new ChannelManager(config);
  
  try {
    // Test 1: List users
    console.log('📋 Test 1: Listing users...');
    const users = await channelManager.listUsers();
    console.log(`Found ${users.length} users`);
    
    // Find Mikhail
    const mikhail = users.find(u => 
      u.email === 'mikhail@starthub.academy' || 
      u.id === '66908542f1798a06218c1fc5'
    );
    
    if (mikhail) {
      console.log(`✓ Found Mikhail: ${mikhail.display_name || mikhail.real_name} (${mikhail.id})`);
    }
    
    // Test 2: List channels
    console.log('\n📋 Test 2: Listing channels...');
    const channels = await channelManager.listChannels();
    console.log(`Found ${channels.length} channels`);
    
    // Look for DM channels
    const dmChannels = channels.filter(c => c.is_private && c.member_count === 2);
    console.log(`- DM channels: ${dmChannels.length}`);
    
    // Test 3: Get or create DM with Mikhail
    if (mikhail) {
      console.log('\n📋 Test 3: Getting DM channel with Mikhail...');
      try {
        const dmChannel = await channelManager.getDMChannel(mikhail.id);
        console.log(`✓ DM channel: ${dmChannel}`);
        
        // Send test message
        console.log('Sending test message...');
        await channelManager.sendMessage(dmChannel, 
          `🧪 Channel Manager Test\n\nThis is a test of the getDMChannel function.\n\nTimestamp: ${new Date().toISOString()}`
        );
        console.log('✓ Message sent successfully');
        
      } catch (error) {
        console.error(`✗ DM test failed: ${error.message}`);
      }
    }
    
    // Test 4: Test group channel creation (dry run)
    console.log('\n📋 Test 4: Testing group channel logic...');
    console.log('Would create group channel with:');
    console.log(`- Bot: ${config.botId}`);
    console.log(`- Admin: ${mikhail?.id || 'unknown'}`);
    console.log(`- Offender: (would be actual user ID)`);
    
    // Test 5: Test cache
    console.log('\n📋 Test 5: Testing cache...');
    console.log(`Channel cache size: ${channelManager.channelCache.size}`);
    console.log(`User cache size: ${channelManager.userCache.size}`);
    
    // Clear and re-test
    channelManager.clearCache();
    console.log('Cache cleared');
    
    // Re-fetch to test cache population
    if (mikhail) {
      const dmChannel2 = await channelManager.getDMChannel(mikhail.id);
      console.log(`✓ Re-fetched DM channel: ${dmChannel2}`);
      console.log(`✓ Cache repopulated: ${channelManager.channelCache.size} channels`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
    
    console.log('\n💡 Note: The actual Pumble API endpoints might be different.');
    console.log('You may need to check Pumble API documentation for:');
    console.log('- Correct endpoint URLs');
    console.log('- Required parameters');
    console.log('- Authentication format');
  }
}

// Run test
if (require.main === module) {
  testChannelManager();
}

module.exports = testChannelManager;