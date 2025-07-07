#!/usr/bin/env node

const axios = require('axios');
const { format } = require('date-fns');

async function sendCronjobMessage() {
  const apiKey = process.env.AGENTSMITH_API_KEY || '5d2c8b9e37f37d98f60ae4c94a311dd5';
  const dmChannelId = process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID || '686860a2851f413511ab90f8';
  const serviceUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
  
  // This is the exact message that would be sent at 6 AM CST on Monday
  const message = `🔔 **Monday Reminder - 1 Hour Notice**

⏰ **Reminders will be sent at:** 9:00 AM
📍 **Target Channels:** #dev, #design
📋 **Type:** Monday Timesheet Reminder

📊 **Pay Period Details:**
• Period: 19
• Dates: 6/24 - 7/7
• Payment: Jul 14

_This is your 1-hour advance notice._`;

  try {
    console.log('📨 Sending Monday reminder advance notification...');
    console.log('This message would be sent at 6 AM CST every Monday\n');
    
    const response = await axios.post(`${serviceUrl}/sendMessage`, {
      channelId: dmChannelId,
      text: message
      // NO asBot parameter - sends as Agent Smith user
    }, {
      headers: { 'Api-Key': apiKey }
    });
    
    console.log('✅ Advance notification sent!');
    console.log('This is exactly what you\'ll receive every Monday at 6 AM CST');
    console.log('\nAt 7 AM CST, the main reminders will be sent to #dev and #design channels');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Set environment if needed
process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID = '686860a2851f413511ab90f8';

sendCronjobMessage();