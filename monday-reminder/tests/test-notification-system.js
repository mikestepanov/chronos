#!/usr/bin/env node

require('dotenv').config();
const MessagingFactory = require('../shared/messaging-factory');

async function testNotificationSystem() {
  console.log('🧪 Testing notification system...\n');
  
  // Create messaging client with notifications enabled
  const config = {
    apiKey: process.env.AGENTSMITH_API_KEY,
    botEmail: process.env.AGENTSMITH_EMAIL,
    botId: process.env.AGENTSMITH_ID
  };
  
  const messaging = MessagingFactory.create('pumble', config, { enableNotifications: true });
  
  // Test sending to dev channel
  const testMessage = `📋 **Test Message with Notification**

This is a test of the notification system.

When this message is sent to #dev, you should also receive a notification in your DM.

Time: ${new Date().toLocaleString()}`;

  try {
    console.log('Sending test message to #dev channel...');
    await messaging.sendMessage(process.env.DEV_CHANNEL_ID, testMessage);
    console.log('✅ Message sent! Check both #dev and your DMs.');
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

testNotificationSystem();