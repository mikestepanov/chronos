#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function sendDM() {
  try {
    console.log('Sending DM to Mikhail...\n');
    
    const apiKey = process.env.PUMBLE_API_KEY;
    const mikhailId = '66908542f1798a06218c1fc5';
    
    if (!apiKey) {
      throw new Error('PUMBLE_API_KEY not found in environment');
    }
    
    console.log(`Using API key: ${apiKey.substring(0, 8)}...`);
    console.log(`Sending to Mikhail ID: ${mikhailId}`);
    
    // Try direct API call
    const response = await axios.post(
      'https://pumble-api-keys.addons.marketplace.cake.com/sendDirectMessage',
      {
        userId: mikhailId,
        text: 'hi',
        asBot: false
      },
      {
        headers: { 
          'Api-Key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Success!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Run
sendDM();