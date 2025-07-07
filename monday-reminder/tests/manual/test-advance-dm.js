#!/usr/bin/env node

/**
 * Test the advance notification DM functionality
 * This uses the actual monday-reminder bot's advance notification method
 */

const MondayReminderBot = require('./monday-reminder');

async function testAdvanceDM() {
  console.log('Testing advance notification DM...\n');
  
  try {
    const bot = new MondayReminderBot();
    
    // Override the date check for testing
    bot.payPeriodCalc.isLastDayOfPeriod = () => true;
    
    console.log('Sending advance notification to Mikhail...');
    await bot.sendAdvanceNotification();
    
    console.log('\n✅ If configured correctly, check your Pumble DMs!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nMake sure you have set up:');
    console.log('- PUMBLE_API_KEY (or AGENTSMITH_API_KEY)');
    console.log('- MIKHAIL_PUMBLE_ID or mikhail user in config');
    console.log('- Proper .env file in project root');
  }
}

// Run the test
testAdvanceDM().catch(console.error);