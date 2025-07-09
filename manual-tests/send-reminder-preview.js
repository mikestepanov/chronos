#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../shared/pumble-client');
const { format } = require('date-fns');

async function sendReminderPreview() {
  try {
    console.log('Sending reminder preview to bot testing channel...\n');
    
    // Initialize Pumble client
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
    
    // Calculate current pay period (assuming bi-weekly, ending on 15th or last day)
    const today = new Date();
    const day = today.getDate();
    let periodEnd, periodStart;
    
    if (day <= 15) {
      periodEnd = new Date(today.getFullYear(), today.getMonth(), 15);
      periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
      periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of month
      periodStart = new Date(today.getFullYear(), today.getMonth(), 16);
    }
    
    // Sample message for Monday reminder
    const message = `⏰ **Timesheet Reminder**

Good morning team! This is a reminder that the current pay period ends this **${format(periodEnd, 'EEEE')}**.

📅 **Current Period**: ${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d')}
⏱️ **Deadline**: ${format(periodEnd, 'EEEE, MMM d')} by EOD

Please ensure your timesheet is complete and submitted on time.

💡 **Quick Tips**:
• Log your hours daily to avoid last-minute rush
• Double-check your entries for accuracy
• Reach out if you need any assistance

_Need help? Contact @mikhail or type @timesheetbot help_

Thank you for your attention to this matter!`;
    
    console.log('Preview of message:\n');
    console.log('-------------------');
    console.log(message);
    console.log('-------------------\n');
    
    // Send message
    const result = await pumble.sendMessage(testChannelId, message, false);
    
    console.log('✅ Preview sent to bot testing channel!');
    console.log('Message ID:', result.id);
    console.log('Timestamp:', result.timestamp);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Run
sendReminderPreview();