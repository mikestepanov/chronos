#!/usr/bin/env node

/**
 * Quick test DM to Mikhail using Agent Smith bot
 */

require('dotenv').config({ path: '../../../.env' });
const { format } = require('date-fns');

// Use the monday reminder bot directly
const MondayReminderBot = require('./monday-reminder');

async function testDMNow() {
  console.log('🤖 Agent Smith Bot - Test DM\n');
  
  // Show current time
  const now = new Date();
  console.log(`Current time: ${format(now, 'h:mm a')} CST`);
  console.log(`Date: ${format(now, 'EEEE, MMMM d, yyyy')}\n`);
  
  try {
    // Create bot instance
    const bot = new MondayReminderBot();
    
    // Send a simple test message
    const testMessage = `🧪 **Test DM from Agent Smith**

⏰ Time: ${format(now, 'h:mm a')} CST
📅 Date: ${format(now, 'EEEE, MMMM d, yyyy')}

This is a test to verify the Monday reminder bot can send you direct messages.

If you're seeing this, the bot configuration is working correctly! ✅`;

    console.log('Sending test DM to Mikhail...');
    await bot.messaging.sendDirectMessage('mikhail', testMessage);
    
    console.log('\n✅ Test DM sent successfully!');
    console.log('Check your Pumble DMs!');
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    if (error.response?.data) {
      console.error('API response:', error.response.data);
    }
  }
}

testDMNow().catch(console.error);