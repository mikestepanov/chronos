#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../../shared/pumble-client');
const { format } = require('date-fns');

async function sendGroupDMPreview() {
  try {
    console.log('Sending GROUP DM preview to bot testing channel...\n');
    
    // Initialize Pumble client
    const pumble = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY,
      botId: require('../../shared/bots').DEFAULT_BOT_ID
    });
    
    // Get bot testing channel
    const fs = require('fs');
    const path = require('path');
    const channels = require('../../shared/channels');
const bots = require('../../shared/bots');
    const testChannelId = channels.BOT_TESTING;
    
    // Sample data
    const sampleUser = "John";
    const hoursLogged = 32;
    const hoursNeeded = 8;
    const periodStart = new Date('2024-07-01');
    const periodEnd = new Date('2024-07-15');
    
    // Group DM message (personalized, direct)
    const message = `Hi ${sampleUser},

You have **${hoursLogged} hours** logged for this pay period. You need **${hoursNeeded} more hours**.

**Period:** ${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d')}
**Deadline:** Today by EOD

Please complete your timesheet today.

cc: @mikhail`;
    
    console.log('Preview of GROUP DM message:\n');
    console.log('-------------------');
    console.log(message);
    console.log('-------------------\n');
    console.log('Note: This would be sent in a group DM with:');
    console.log('- Bot (Agent Smith)');
    console.log('- User (e.g., John)');
    console.log('- Mikhail\n');
    
    // Send preview to test channel
    const result = await pumble.sendMessage(testChannelId, message, false);
    
    console.log('✅ Group DM preview sent to bot testing channel!');
    console.log('Message ID:', result.id);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Run
sendGroupDMPreview();