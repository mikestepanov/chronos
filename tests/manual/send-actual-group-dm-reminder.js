#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../shared/pumble-client');
const { format } = require('date-fns');

async function sendActualReminder() {
  try {
    console.log('Sending actual GROUP DM reminder preview...\n');
    
    const pumble = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY,
      botId: process.env.PUMBLE_BOT_ID || '686860a1851f413511ab90ef'
    });
    
    // Get bot testing channel for preview
    const fs = require('fs');
    const path = require('path');
    const channelsPath = path.join(__dirname, '../config/channels.json');
    const channelsData = fs.readFileSync(channelsPath, 'utf8');
    const channels = JSON.parse(channelsData).pumble;
    const testChannelId = channels.bot_testing.id;
    
    // Sample data for someone who needs to submit timesheet
    const userName = "Dharam";
    const hoursLogged = 64;
    const hoursNeeded = 6;
    const periodStart = new Date('2024-07-01');
    const periodEnd = new Date('2024-07-15');
    
    // The actual message format used in GroupDMService
    const message = `Hi ${userName},

You have **${hoursLogged} hours** logged for this pay period. You need **${hoursNeeded} more hours**.

**Period:** ${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d')}
**Deadline:** Today by EOD

Please complete your timesheet today.

cc: @mikhail`;
    
    console.log('This is the ONLY type of reminder we send:\n');
    console.log('GROUP DM with 3 people:');
    console.log('• Bot (Agent Smith)');
    console.log('• User (who has incomplete timesheet)'); 
    console.log('• Mikhail\n');
    console.log('Message content:');
    console.log('-------------------');
    console.log(message);
    console.log('-------------------\n');
    
    // Send to test channel
    const result = await pumble.sendMessage(testChannelId, message, false);
    
    console.log('✅ Reminder preview sent to bot testing channel!');
    console.log('\nThis message is sent after someone has incomplete timesheet for 24+ hours.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run
sendActualReminder();