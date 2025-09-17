#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../../shared/pumble-client');
const { format } = require('date-fns');

async function sendWithPeriodNumber() {
  try {
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
    
    // Example data
    const userName = "Alex";
    const hoursLogged = 65;
    const expectedHours = 80;
    const acceptableMinimum = expectedHours - 3;
    const periodStart = new Date('2024-07-01');
    const periodEnd = new Date('2024-07-15');
    
    // Calculate pay period number (1-24 for bi-weekly, or 1-26 for some years)
    const year = periodEnd.getFullYear();
    const month = periodEnd.getMonth();
    const day = periodEnd.getDate();
    
    // Simple calculation: 2 periods per month
    const periodNumber = (month * 2) + (day > 15 ? 2 : 1);
    
    const message = `Hi ${userName},

You logged **${hoursLogged} hours**, which is less than the acceptable range of **${acceptableMinimum} hours**. Expected hours are **${expectedHours}** for you for each pay period.

**Pay Period #${periodNumber}:** ${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d')}

Please double check that you didn't miss the submission - ignore this message if you think your submission is right.

cc: @mikhail`;
    
    console.log('Sending test with pay period number...\n');
    
    // Send to test channel
    await pumble.sendMessage(testChannelId, message, false);
    
    console.log('✅ Test message sent with pay period #' + periodNumber);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run
sendWithPeriodNumber();