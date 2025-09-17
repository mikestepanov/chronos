#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../../shared/pumble-client');
const { format } = require('date-fns');

async function sendExample() {
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
    
    // Current pay period (example: July 1-15)
    const message = `Hi Sarah,

You have **28 hours** logged for this pay period. You need **42 more hours**.

**Period:** Jul 1 - Jul 15
**Deadline:** Today by EOD

Please complete your timesheet today.

cc: @mikhail`;
    
    // Send to test channel
    await pumble.sendMessage(testChannelId, message, false);
    
    console.log('✅ Example reminder sent to bot testing channel!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run
sendExample();