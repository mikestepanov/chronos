#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../../shared/pumble-client');
const PayPeriodCalculator = require('../../shared/pay-period-calculator');
const channels = require('../../shared/channels');

// Get bot testing channel ID from central config
const BOT_TESTING_CHANNEL_ID = channels.BOT_TESTING;

async function sendToTestChannel() {
  try {
    console.log('Sending pay period reminder to bot testing channel...\n');
    
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
    
    console.log('--- MESSAGE PREVIEW ---');
    console.log(message);
    console.log('--- END PREVIEW ---\n');
    
    // Send to bot testing channel
    await pumbleClient.sendMessage(BOT_TESTING_CHANNEL_ID, message, false);
    
    console.log('✅ Message sent to bot testing channel!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Run
sendToTestChannel();