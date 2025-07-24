#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../../shared/pumble-client');
const { format } = require('date-fns');

async function showBothTypes() {
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
    
    const periodStart = new Date('2024-07-01');
    const periodEnd = new Date('2024-07-15');
    
    console.log('=== REMINDER TYPES IN CHRONOS ===\n');
    
    // Type 1: Monday channel message
    const mondayMessage = `🔔 **Pay Period Ending Soon**

The current pay period (${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d')}) ends this **${format(periodEnd, 'EEEE')}**.

Please ensure your timesheet is complete by end of day.`;
    
    console.log('1️⃣ MONDAY BIWEEKLY (to dev/design channels):');
    console.log('-------------------');
    console.log(mondayMessage);
    console.log('-------------------\n');
    
    // Type 2: Follow-up group DM
    const followupMessage = `Hi John,

You have **32 hours** logged for this pay period. You need **8 more hours**.

**Period:** ${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d')}
**Deadline:** Today by EOD

Please complete your timesheet today.

cc: @mikhail`;
    
    console.log('2️⃣ DAILY FOLLOW-UP (group DM to individual):');
    console.log('-------------------');
    console.log(followupMessage);
    console.log('-------------------');
    console.log('Sent to: Bot + User + Mikhail (3-person DM)\n');
    
    // Send both to test channel for preview
    await pumble.sendMessage(testChannelId, '**=== MONDAY BIWEEKLY (Channel Message) ===**', false);
    await pumble.sendMessage(testChannelId, mondayMessage, false);
    
    await pumble.sendMessage(testChannelId, '\n**=== DAILY FOLLOW-UP (Group DM) ===**', false);
    await pumble.sendMessage(testChannelId, followupMessage, false);
    
    console.log('✅ Both reminder types sent to bot testing channel!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run
showBothTypes();