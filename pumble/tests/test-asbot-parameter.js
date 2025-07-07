#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testAsBotParameter() {
  const apiKey = process.env.AGENTSMITH_API_KEY;
  const baseUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
  const channelId = process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID;
  
  console.log('🧪 Testing asBot parameter...\n');
  
  try {
    // Test 1: asBot = true
    console.log('1️⃣ Sending with asBot: true');
    const response1 = await axios.post(`${baseUrl}/sendMessage`, {
      channelId,
      text: `Test 1: asBot=true\nThis should show as "Agent Smith (bot)"`,
      asBot: true
    }, {
      headers: { 'Api-Key': apiKey }
    });
    console.log('✅ Sent successfully');
    console.log('Author ID:', response1.data.author);
    
    // Wait a second
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: asBot = false  
    console.log('\n2️⃣ Sending with asBot: false');
    const response2 = await axios.post(`${baseUrl}/sendMessage`, {
      channelId,
      text: `Test 2: asBot=false\nThis might show differently`,
      asBot: false
    }, {
      headers: { 'Api-Key': apiKey }
    });
    console.log('✅ Sent successfully');
    console.log('Author ID:', response2.data.author);
    
    // Test 3: No asBot parameter
    console.log('\n3️⃣ Sending without asBot parameter');
    const response3 = await axios.post(`${baseUrl}/sendMessage`, {
      channelId,
      text: `Test 3: No asBot parameter\nChecking default behavior`
    }, {
      headers: { 'Api-Key': apiKey }
    });
    console.log('✅ Sent successfully');
    console.log('Author ID:', response3.data.author);
    
    console.log('\n📊 Response comparison:');
    console.log('All author IDs:', [response1.data.author, response2.data.author, response3.data.author]);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAsBotParameter();