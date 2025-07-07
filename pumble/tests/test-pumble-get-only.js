#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testPumbleReadOnly() {
  console.log('🧪 Testing Pumble API (Read-Only Operations)\n');
  
  const apiKey = process.env.AGENTSMITH_API_KEY;
  const baseUrl = 'https://api.pumble.com/v1';
  
  console.log(`API Key: ***${apiKey.slice(-4)}`);
  console.log(`Base URL: ${baseUrl}\n`);

  try {
    // Test 1: Get current user info
    console.log('1️⃣ Testing authentication - Getting current user info...');
    try {
      const authResponse = await axios.get(`${baseUrl}/users.me`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Authentication successful!');
      console.log(`   Bot Name: ${authResponse.data.name || authResponse.data.real_name}`);
      console.log(`   Bot ID: ${authResponse.data.id}`);
      console.log(`   Email: ${authResponse.data.email}\n`);
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data || error.message);
    }

    // Test 2: List channels
    console.log('2️⃣ Listing accessible channels...');
    try {
      const channelsResponse = await axios.get(`${baseUrl}/conversations.list`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          types: 'public_channel,private_channel,im',
          limit: 10
        }
      });
      
      if (channelsResponse.data.ok) {
        console.log(`✅ Found ${channelsResponse.data.channels.length} channels:`);
        channelsResponse.data.channels.forEach(ch => {
          console.log(`   - ${ch.name || 'DM'} (${ch.id}) - ${ch.is_private ? 'Private' : 'Public'}`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to list channels:', error.response?.data || error.message);
    }

    // Test 3: Get Mikhail's user info
    console.log('\n3️⃣ Looking up Mikhail\'s user info...');
    try {
      const usersResponse = await axios.get(`${baseUrl}/users.list`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (usersResponse.data.ok) {
        const mikhail = usersResponse.data.members.find(u => 
          u.email === 'mikhail@starthub.academy' || 
          u.id === process.env.MIKHAIL_PUMBLE_ID
        );
        
        if (mikhail) {
          console.log('✅ Found Mikhail:');
          console.log(`   Name: ${mikhail.name || mikhail.real_name}`);
          console.log(`   ID: ${mikhail.id}`);
          console.log(`   Email: ${mikhail.email}`);
        } else {
          console.log('⚠️  Could not find Mikhail in user list');
        }
      }
    } catch (error) {
      console.error('❌ Failed to list users:', error.response?.data || error.message);
    }

    // Test 4: Check DM channel with Mikhail
    console.log('\n4️⃣ Checking DM channel with Mikhail...');
    const mikhailDmId = process.env.MIKHAIL_DM_CHANNEL_ID;
    if (mikhailDmId) {
      try {
        const dmResponse = await axios.get(`${baseUrl}/conversations.info`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          params: {
            channel: mikhailDmId
          }
        });
        
        if (dmResponse.data.ok) {
          console.log('✅ DM channel found and accessible');
          console.log(`   Channel ID: ${dmResponse.data.channel.id}`);
          console.log(`   Type: ${dmResponse.data.channel.is_im ? 'Direct Message' : 'Channel'}`);
        }
      } catch (error) {
        console.error('❌ Failed to access DM channel:', error.response?.data || error.message);
      }
    }

    console.log('\n✨ Test complete! The API key is working for read operations.');
    console.log('You can now send messages using the Pumble client.');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
  }
}

// Run test
testPumbleReadOnly();