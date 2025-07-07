#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../../shared/pumble-client');

async function sendMondayTestToMikhail() {
  const pumble = new PumbleClient({
    apiKey: process.env.AGENTSMITH_API_KEY,
    botEmail: process.env.AGENTSMITH_EMAIL,
    botId: process.env.AGENTSMITH_ID
  });

  const channelId = process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID;
  
  // Get current date info
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  // Simulate Monday morning reminder
  const message = `**Good Morning Mikhail,**

A Quick Reminder: The 26th pay-period is fast approaching!

Please begin to input Kimai data today (${fullDate}) end of day. Please note that this paycheck will account for the full 2 weeks. This 26th payroll period will include the dates from 12/23/2024 – 1/5/2025. (Meaning that today (Monday, January 6, 2025) is also counted for the 26th pay-period, TOMORROW (Tuesday, January 7, 2025) is counted for the 27th pay-period.)

For those of you that have been given extra hours, please ensure to input them into Kimai for this pay-period as well.

Please expect the payment to go through on the Monday, January 13, 2025.

If you have any questions or concerns, please do not hesitate to reach out to Mikhail.

Thank you.

@here`;

  try {
    console.log('📨 Sending Monday test reminder to Mikhail...');
    console.log('Channel ID:', channelId);
    
    const result = await pumble.sendMessage(channelId, message);
    console.log('✅ Monday reminder sent successfully!');
    console.log('Message ID:', result.id);
  } catch (error) {
    console.error('❌ Failed to send message:', error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

sendMondayTestToMikhail();