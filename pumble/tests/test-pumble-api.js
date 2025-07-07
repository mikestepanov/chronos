#!/usr/bin/env node

const axios = require('axios');

async function testPumbleAPI() {
  console.log('Testing Pumble API endpoints...\n');

  // Test 1: Pumble Official API
  console.log('1. Testing Official Pumble API (https://api.pumble.com/v1)');
  try {
    const response = await axios.get('https://api.pumble.com/v1', {
      headers: {
        'User-Agent': 'Pumble-Bot-Test/1.0'
      }
    });
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   Error:', error.response?.status || error.message);
    if (error.response?.data) {
      console.log('   Details:', JSON.stringify(error.response.data, null, 2));
    }
  }

  // Test 2: Pumble API Keys Service
  console.log('\n2. Testing Pumble API Keys Service (https://pumble-api-keys.addons.marketplace.cake.com)');
  try {
    const response = await axios.get('https://pumble-api-keys.addons.marketplace.cake.com', {
      headers: {
        'User-Agent': 'Pumble-Bot-Test/1.0'
      }
    });
    console.log('   Status:', response.status);
    console.log('   Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('   Error:', error.response?.status || error.message);
    if (error.response?.data) {
      console.log('   Details:', JSON.stringify(error.response.data, null, 2));
    }
  }

  // Test 3: Check available endpoints
  console.log('\n3. Testing specific endpoints:');
  
  const endpoints = [
    'https://api.pumble.com/v1/channels',
    'https://api.pumble.com/v1/users',
    'https://pumble-api-keys.addons.marketplace.cake.com/listChannels',
    'https://pumble-api-keys.addons.marketplace.cake.com/sendMessage'
  ];

  for (const endpoint of endpoints) {
    console.log(`\n   Testing: ${endpoint}`);
    try {
      const response = await axios.get(endpoint, {
        headers: {
          'User-Agent': 'Pumble-Bot-Test/1.0'
        }
      });
      console.log('   ✓ Accessible (Status:', response.status + ')');
    } catch (error) {
      const status = error.response?.status;
      if (status === 401) {
        console.log('   ✓ Endpoint exists (requires authentication)');
      } else if (status === 405) {
        console.log('   ✓ Endpoint exists (wrong HTTP method)');
      } else if (status === 404) {
        console.log('   ✗ Endpoint not found');
      } else {
        console.log('   ? Error:', status || error.message);
      }
    }
  }

  console.log('\n\nSummary:');
  console.log('- The official Pumble API requires Bearer token authentication');
  console.log('- The pumble-api-keys service might be a custom wrapper that uses Api-Key headers');
  console.log('- You\'ll need to set your API key in the .env file to use either service');
}

// Run the test
testPumbleAPI();