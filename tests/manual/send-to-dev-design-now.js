#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../../shared/pumble-client');
const PayPeriodCalculator = require('../../shared/pay-period-calculator');
const channels = require('../../config/channels.json');

// Load channel IDs from config
const DEV_CHANNEL_ID = channels.DEV;
const DESIGN_CHANNEL_ID = channels.DESIGN;

async function sendToChannels() {
  try {
    console.log('Sending pay period reminder to dev and design channels...\n');
    
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
    
    // Send to both channels
    console.log('Sending to dev channel...');
    await pumbleClient.sendMessage(DEV_CHANNEL_ID, message, false);
    console.log('✅ Sent to dev channel');
    
    console.log('\nSending to design channel...');
    await pumbleClient.sendMessage(DESIGN_CHANNEL_ID, message, false);
    console.log('✅ Sent to design channel');
    
    console.log('\n✅ All messages sent successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Run
sendToChannels();