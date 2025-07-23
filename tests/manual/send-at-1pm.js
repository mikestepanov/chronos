#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../shared/pumble-client');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const { format } = require('date-fns');
const channels = require('../config/channels.json');

// Load channel IDs from config
const DEV_CHANNEL_ID = channels.pumble.dev.id;
const DESIGN_CHANNEL_ID = channels.pumble.design.id;
const BOT_TESTING_CHANNEL_ID = channels.pumble.bot_testing.id;

async function sendToChannels() {
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
  
  console.log('\n📤 Sending messages...\n');
  
  // Send to both channels
  try {
    console.log('Sending to dev channel...');
    await pumbleClient.sendMessage(DEV_CHANNEL_ID, message, false);
    console.log('✅ Sent to dev channel');
  } catch (error) {
    console.error('❌ Failed to send to dev channel:', error.message);
  }
  
  try {
    console.log('\nSending to design channel...');
    await pumbleClient.sendMessage(DESIGN_CHANNEL_ID, message, false);
    console.log('✅ Sent to design channel');
  } catch (error) {
    console.error('❌ Failed to send to design channel:', error.message);
  }
}

function waitUntil1PM() {
  console.log('⏰ Waiting until 1:00 PM to send reminders...\n');
  
  const checkTime = () => {
    const now = new Date();
    const currentTime = format(now, 'HH:mm:ss');
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    console.log(`⏱️  Current time: ${currentTime} - Waiting for 13:00:00...`);
    
    // Check if it's 1 PM (13:00 in 24-hour format)
    if (hour === 13 && minute === 0) {
      console.log('\n🎯 It\'s 1:00 PM! Time to send reminders!\n');
      clearInterval(interval);
      sendToChannels().then(() => {
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
waitUntil1PM();