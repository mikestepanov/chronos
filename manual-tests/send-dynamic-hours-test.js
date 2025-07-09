#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../shared/pumble-client');
const { format } = require('date-fns');

async function sendDynamicHoursTest() {
  try {
    const pumble = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY,
      botId: process.env.PUMBLE_BOT_ID || '686860a1851f413511ab90ef'
    });
    
    // Get bot testing channel
    const fs = require('fs');
    const path = require('path');
    const channelsPath = path.join(__dirname, '../config/channels.json');
    const channelsData = fs.readFileSync(channelsPath, 'utf8');
    const channels = JSON.parse(channelsData).pumble;
    const testChannelId = channels.bot_testing.id;
    
    // Example with dynamic hours from users.json
    const userName = "Alex";
    const hoursLogged = 65;
    const expectedHours = 80; // From users.json (default)
    const acceptableMinimum = expectedHours - 3; // 77 hours
    const periodStart = new Date('2024-07-01');
    const periodEnd = new Date('2024-07-15');
    
    const message = `Hi ${userName},

You logged **${hoursLogged} hours**, which is less than the acceptable range of **${acceptableMinimum} hours**. Expected hours are **${expectedHours}** for you for each pay period.

**Period:** ${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d')}

Please double check that you didn't miss the submission - ignore this message if you think your submission is right.

cc: @mikhail`;
    
    console.log('Sending test with dynamic hours (80 expected)...\n');
    
    // Send to test channel
    await pumble.sendMessage(testChannelId, message, false);
    
    console.log('✅ Test message sent!');
    console.log(`Shows: ${hoursLogged}h logged < ${acceptableMinimum}h minimum (${expectedHours}h expected)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run
sendDynamicHoursTest();