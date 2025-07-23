#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('./shared/pumble-client');
const PayPeriodCalculator = require('./shared/pay-period-calculator');

async function sendPayPeriodReminder(dryRun = true) {
  try {
    console.log('🤖 Bot-to-Mikhail Pay Period Reminder\n');
    
    // Initialize PumbleClient with proper config
    const pumbleClient = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY,
      botId: process.env.BOT_ID || '686860a1851f413511ab90ef',
      botEmail: process.env.AGENTSMITH_EMAIL
    });
    
    const channelId = process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID || '686860a2851f413511ab90f8';
    
    console.log('Configuration:');
    console.log(`- Bot Identity: ${process.env.BOT_IDENTITY || 'agentsmith'}`);
    console.log(`- Channel ID: ${channelId}`);
    console.log(`- API Key: ${process.env.PUMBLE_API_KEY?.substring(0, 8)}...`);
    console.log(`- Mode: ${dryRun ? 'DRY RUN (not sending)' : 'LIVE (will send)'}\n`);
    
    // Validate configuration
    if (!process.env.PUMBLE_API_KEY) {
      console.error('❌ Missing required environment variable: PUMBLE_API_KEY');
      process.exit(1);
    }
    
    // Generate pay period reminder message
    const calculator = new PayPeriodCalculator();
    const message = calculator.generateReminderMessage({
      referenceDate: new Date(),
      includeExtraHours: true,
      teamName: 'Team'
    });
    
    console.log('📝 MESSAGE PREVIEW:');
    console.log('─'.repeat(50));
    console.log(message);
    console.log('─'.repeat(50));
    console.log();
    
    if (dryRun) {
      console.log('✅ DRY RUN COMPLETE - Message NOT sent');
      console.log('\nTo send the message for real, run:');
      console.log('  node send-pay-period-dm-via-pumble-client.js --send');
      return;
    }
    
    // Send the message using PumbleClient (asBot defaults to false inside the class)
    console.log('📤 Sending message...');
    const result = await pumbleClient.sendMessage(channelId, message);
    
    if (result && result.id) {
      console.log('✅ Message sent successfully!');
      console.log(`Message ID: ${result.id}`);
      console.log(`Timestamp: ${result.timestamp}`);
    } else {
      console.error('❌ Unexpected response:', result);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const shouldSend = args.includes('--send') || args.includes('-s');

// Run the script
sendPayPeriodReminder(!shouldSend);