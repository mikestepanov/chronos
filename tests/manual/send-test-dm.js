#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../shared/pumble-client');
const PayPeriodCalculator = require('../shared/pay-period-calculator');

// Mikhail's DM channel with Agent Smith bot
const MIKHAIL_DM_CHANNEL_ID = '686860a2851f413511ab90f8';

async function sendDM() {
  try {
    console.log('Sending pay period reminder DM to Mikhail...\n');
    
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
    
    // Send DM
    await pumbleClient.sendMessage(MIKHAIL_DM_CHANNEL_ID, message, false);
    
    console.log('✅ DM sent successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Run
sendDM();