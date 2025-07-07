#!/usr/bin/env node

/**
 * Send a test message to Mikhail right now
 */

const MondayReminderBot = require('./monday-reminder');
const { format } = require('date-fns');

async function sendTestMessage() {
  console.log('📨 Sending test message to Mikhail...\n');
  
  try {
    const bot = new MondayReminderBot();
    
    // Override the date check to force sending
    bot.payPeriodCalc.isLastDayOfPeriod = () => true;
    
    // Send the advance notification
    await bot.sendAdvanceNotification();
    
    console.log('\n✅ Message sent! Check your Pumble DMs.');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Set required environment variables
process.env.MESSAGING_PLATFORM = 'pumble';
process.env.KIMAI_URL = 'https://kimai.starthub.academy';
process.env.KIMAI_API_KEY = 'dummy';
process.env.PUMBLE_API_KEY = process.env.AGENTSMITH_API_KEY || '5d2c8b9e37f37d98f60ae4c94a311dd5';
process.env.MIKHAIL_PUMBLE_ID = '66908542f1798a06218c1fc5';

// Send it
sendTestMessage().catch(console.error);