#!/usr/bin/env node

const axios = require('axios');
const { format } = require('date-fns');

async function sendViaService() {
  const apiKey = process.env.AGENTSMITH_API_KEY || '5d2c8b9e37f37d98f60ae4c94a311dd5';
  const serviceUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
  
  const now = new Date();
  const message = `🔔 **Test Message from Monday Reminder Bot**

⏰ **Time:** ${format(now, 'h:mm a')} CST
📅 **Date:** ${format(now, 'EEEE, MMMM d, yyyy')}

This is a test of the Monday reminder bot DM functionality.

If you're seeing this message, the bot can successfully send you notifications! ✅

_Sent via Agent Smith bot_`;

  try {
    console.log('📡 Getting channels from service...');
    const channelsResponse = await axios.get(`${serviceUrl}/listChannels`, {
      headers: { 'Api-Key': apiKey }
    });
    
    console.log(`Found ${channelsResponse.data.length} channels`);
    
    // Try to find a DM channel or test channel
    const channels = channelsResponse.data;
    
    // Look for your DM channel
    const dmChannel = channels.find(ch => 
      ch.channelType === 'DIRECT' && 
      (ch.name?.includes('Mikhail') || ch.name?.includes('mikhail'))
    );
    
    // Or find #test channel
    const testChannel = channels.find(ch => 
      ch.name === 'test' || ch.name === 'bot-test'
    );
    
    const targetChannel = dmChannel || testChannel || channels.find(ch => ch.name === 'dev');
    
    if (targetChannel) {
      console.log(`\n📨 Sending to channel: ${targetChannel.name || targetChannel.id}`);
      
      const msgResponse = await axios.post(`${serviceUrl}/sendMessage`, {
        channelId: targetChannel.id,
        text: message,
        asBot: true
      }, {
        headers: { 'Api-Key': apiKey }
      });
      
      console.log('✅ Message sent successfully!');
      console.log(`Channel: ${targetChannel.name || 'DM'}`);
      console.log(`Message ID: ${msgResponse.data.id}`);
    } else {
      console.log('❌ Could not find suitable channel');
      console.log('\nAvailable channels:');
      channels.slice(0, 10).forEach(ch => {
        console.log(`- ${ch.name || 'Unnamed'} (${ch.id}) - Type: ${ch.channelType || 'Unknown'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

sendViaService().catch(console.error);