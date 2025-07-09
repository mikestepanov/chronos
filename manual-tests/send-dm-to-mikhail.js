#!/usr/bin/env node

const PumbleClient = require('../shared/pumble-client');
const UserService = require('../config/users/UserService');

async function sendDMToMikhail() {
  try {
    console.log('Sending DM to Mikhail...\n');
    
    // Get Mikhail's ID from users.json
    const userService = new UserService();
    const mikhail = userService.getActiveUsers().find(u => u.id === 'mikhail-stepanov');
    const mikhailId = mikhail.services.pumble.id;
    
    console.log(`Found Mikhail: ${mikhail.name} (${mikhailId})`);
    
    // Initialize Pumble client
    const pumbleClient = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY,
      botId: process.env.PUMBLE_BOT_ID || '686860a1851f413511ab90ef'
    });
    
    // Send direct message
    console.log('Sending message...');
    await pumbleClient.sendDirectMessage(mikhailId, 'hi');
    
    console.log('✅ DM sent successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', error.response.data);
    }
  }
}

// Run
if (require.main === module) {
  sendDMToMikhail();
}