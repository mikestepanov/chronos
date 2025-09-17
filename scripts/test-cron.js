#!/usr/bin/env node

/**
 * Test cron job that sends messages every 5 minutes to bot-testing channel
 * This is for testing purposes only - remove after testing
 */

const { execSync } = require('child_process');
const path = require('path');

async function sendTestMessage() {
  try {
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', { 
      timeZone: 'America/Chicago',
      hour12: true 
    });
    
    const message = `🤖 Test cron message - ${timestamp} CST

This is an automated test message sent every 5 minutes.
Testing deployment and cron functionality.

Will be replaced with Monday reminder logic.`;
    
    console.log('Sending test message to bot-testing channel...');
    
    // Use the send-message.js script which is already working
    const scriptPath = path.join(__dirname, 'send-message.js');
    const command = `node "${scriptPath}" send -c bot_testing -m "${message}"`;
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: __dirname
    });
    
    console.log('✅ Test message sent successfully');
    
  } catch (error) {
    console.error('❌ Error sending test message:', error);
    process.exit(1);
  }
}

// Run immediately
sendTestMessage().catch(console.error);