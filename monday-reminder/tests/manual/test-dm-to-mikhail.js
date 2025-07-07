#!/usr/bin/env node

/**
 * Quick test to verify DM functionality to Mikhail
 * Run: node test-dm-to-mikhail.js
 */

const ConfigLoader = require('../shared/config-loader');
const MessagingFactory = require('../shared/messaging-factory');
const { format } = require('date-fns');

async function testDM() {
  console.log('Loading configuration...');
  const config = ConfigLoader.load();
  
  console.log('Creating messaging client...');
  const messaging = MessagingFactory.create(
    config.messaging.platform,
    config.messaging[config.messaging.platform]
  );

  const now = new Date();
  const testMessage = `🧪 **Test DM from Monday Reminder Bot**

⏰ **Current Time:** ${format(now, 'h:mm a')} CST
📅 **Date:** ${format(now, 'EEEE, MMMM d, yyyy')}

This is a test to verify:
✓ Bot can send direct messages
✓ Configuration is correct
✓ API keys are working

If you're seeing this, the bot is working correctly! 🎉`;

  try {
    console.log('\nSending test DM to Mikhail...');
    await messaging.sendDirectMessage('mikhail', testMessage);
    console.log('✅ Test DM sent successfully!');
    console.log('\nCheck your Pumble DMs for the message.');
  } catch (error) {
    console.error('❌ Failed to send test DM:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.data);
    }
  }
}

// Run the test
if (require.main === module) {
  testDM().catch(console.error);
}