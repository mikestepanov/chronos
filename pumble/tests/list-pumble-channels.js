#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../shared/pumble-client');

async function listChannels() {
  const pumble = new PumbleClient({
    apiKey: process.env.AGENTSMITH_API_KEY,
    botEmail: process.env.AGENTSMITH_EMAIL,
    botId: process.env.AGENTSMITH_ID
  });

  console.log('📋 Fetching Pumble channels...\n');
  
  try {
    const channels = await pumble.getChannels();
    console.log(`✅ Found ${channels.length} channels:\n`);
    
    // Debug: Show raw response structure
    console.log('🔍 Raw channel data (first 3):');
    channels.slice(0, 3).forEach((ch, idx) => {
      console.log(`\nChannel ${idx + 1}:`, JSON.stringify(ch, null, 2));
    });
    
    // Group by type
    const publicChannels = [];
    const privateChannels = [];
    const directMessages = [];
    
    channels.forEach(ch => {
      const channelInfo = {
        id: ch.id,
        name: ch.name || ch.real_name || 'Direct Message',
        type: ch.is_channel ? 'channel' : ch.is_group ? 'group' : ch.is_im ? 'dm' : 'unknown',
        is_private: ch.is_private,
        members: ch.members || [],
        user: ch.user
      };
      
      if (ch.is_im) {
        directMessages.push(channelInfo);
      } else if (ch.is_private) {
        privateChannels.push(channelInfo);
      } else {
        publicChannels.push(channelInfo);
      }
    });
    
    // Display channels
    if (publicChannels.length > 0) {
      console.log('🌐 Public Channels:');
      publicChannels.forEach(ch => {
        console.log(`   - ${ch.name} (${ch.id})`);
      });
    }
    
    if (privateChannels.length > 0) {
      console.log('\n🔒 Private Channels:');
      privateChannels.forEach(ch => {
        console.log(`   - ${ch.name} (${ch.id})`);
      });
    }
    
    if (directMessages.length > 0) {
      console.log('\n💬 Direct Messages:');
      directMessages.forEach(ch => {
        console.log(`   - ${ch.name} (${ch.id}) - User: ${ch.user}`);
      });
    }
    
    // Look for Mikhail's DM
    console.log('\n🔍 Looking for Mikhail\'s DM channel...');
    const mikhailChannels = channels.filter(ch => 
      ch.id === process.env.MIKHAIL_DM_CHANNEL_ID ||
      ch.user === process.env.MIKHAIL_PUMBLE_ID ||
      (ch.name && ch.name.toLowerCase().includes('mikhail'))
    );
    
    if (mikhailChannels.length > 0) {
      console.log('✅ Found potential Mikhail channels:');
      mikhailChannels.forEach(ch => {
        console.log(`   - ${ch.name || 'DM'} (${ch.id}) - Type: ${ch.is_im ? 'DM' : 'Channel'}`);
      });
    } else {
      console.log('❌ Could not find Mikhail\'s channel in the list');
    }
    
  } catch (error) {
    console.error('❌ Failed to fetch channels:', error.message);
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

listChannels();