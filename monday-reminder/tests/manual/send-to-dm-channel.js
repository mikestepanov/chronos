#!/usr/bin/env node

const axios = require('axios');
const { format } = require('date-fns');

async function sendToDMChannel() {
  const apiKey = process.env.AGENTSMITH_API_KEY || '5d2c8b9e37f37d98f60ae4c94a311dd5';
  const serviceUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
  const dmChannelId = '686860a2851f413511ab90f8'; // Your DM channel with Agent Smith
  
  const now = new Date();
  const message = `🎉 **Success! Monday Reminder Bot is working!**

⏰ **Time:** ${format(now, 'h:mm:ss a')} CST
📅 **Date:** ${format(now, 'EEEE, MMMM d, yyyy')}

✅ I found your DM channel and can send you messages!

Your Monday reminders will be sent to this channel:
• 1-hour advance notice at 6 AM CST
• Main reminders sent to #dev and #design at 7 AM CST

The bot is fully configured and ready to go! 🚀

_Sent by Agent Smith Bot_`;

  try {
    console.log('📨 Sending message to your DM channel...');
    
    const response = await axios.post(`${serviceUrl}/sendMessage`, {
      channelId: dmChannelId,
      text: message,
      asBot: true
    }, {
      headers: { 'Api-Key': apiKey }
    });
    
    console.log('\n✅ MESSAGE SENT SUCCESSFULLY!');
    console.log('Check your Pumble DMs with Agent Smith bot!');
    console.log(`Message ID: ${response.data.id}`);
    console.log(`\n💡 Your DM channel ID: ${dmChannelId}`);
    console.log('Add this to your .env: BOT_TO_MIKHAIL_DM_CHANNEL_ID=' + dmChannelId);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

sendToDMChannel();