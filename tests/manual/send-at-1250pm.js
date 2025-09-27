#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../../shared/pumble-client');
const PayPeriodCalculator = require('../../shared/pay-period-calculator');
const { format } = require('date-fns');
const channels = require('../../config/channels.json');

// Load channel ID from config
const BOT_TESTING_CHANNEL_ID = channels.pumble.bot_testing.id;

async function sendToTestChannel() {
  const apiKey = process.env.PUMBLE_API_KEY || process.env.AGENTSMITH_API_KEY;
  
  if (!apiKey) {
    throw new Error('PUMBLE_API_KEY not found in environment');
  }
  
  // Initialize PumbleClient
  const pumbleClient = new PumbleClient({
    apiKey: apiKey
  });
  
  // Generate pay period reminder message
  const calculator = new PayPeriodCalculator();
  const message = calculator.generateReminderMessage({
    referenceDate: new Date(),
    includeExtraHours: true,
    teamName: 'Team'
  });
  
  console.log('\n📤 Sending message to bot testing channel...\n');
  
  try {
    await pumbleClient.sendMessage(BOT_TESTING_CHANNEL_ID, message, false);
    console.log('✅ Sent to bot testing channel');
  } catch (error) {
    console.error('❌ Failed to send:', error.message);
  }
}

function waitUntil1250PM() {
  console.log('⏰ Waiting until 12:50 PM to send reminder...\n');
  
  const checkTime = () => {
    const now = new Date();
    const currentTime = format(now, 'HH:mm:ss');
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    console.log(`⏱️  Current time: ${currentTime} - Waiting for 12:50:00...`);
    
    // Check if it's 12:50 PM
    if (hour === 12 && minute === 50) {
      console.log('\n🎯 It\'s 12:50 PM! Time to send reminder!\n');
      clearInterval(interval);
      sendToTestChannel().then(() => {
        console.log('\n✅ All done!');
        process.exit(0);
      }).catch(error => {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
      });
    }
  };
  
  // Check immediately
  checkTime();
  
  // Then check every 30 seconds
  const interval = setInterval(checkTime, 30000);
  
  console.log('📌 Press Ctrl+C to cancel\n');
}

// Run
waitUntil1250PM();