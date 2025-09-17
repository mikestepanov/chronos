#!/usr/bin/env node

const GroupDMService = require('../kimai/services/GroupDMService');

async function sendHi() {
  try {
    console.log('Sending "hi" to group DM...\n');
    
    // Initialize service
    const groupDMService = new GroupDMService();
    
    // Eugene's user data
    const eugeneUser = {
      id: 'eugene-test',
      name: 'Eugene',
      services: {
        pumble: {
          id: '66ad3fc6fa0959319e3b5259'
        }
      }
    };
    
    // Get or create group DM and send message
    const conversationId = await groupDMService.getOrCreateGroupDM(eugeneUser.services.pumble.id);
    
    // Send simple message
    await groupDMService.pumbleClient.sendMessage(conversationId, 'hi', false);
    
    console.log('✅ Message sent successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run
if (require.main === module) {
  sendHi();
}