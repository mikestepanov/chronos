#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios = require('axios');

async function testEndpoints() {
  const baseUrl = process.env.KIMAI_URL || 'https://kimai.starthub.academy';
  const apiKey = process.env.KIMAI_API_KEY;
  
  // Try both header formats
  const authHeaders = [
    { 'Authorization': `Bearer ${apiKey}` },
    { 'X-AUTH-TOKEN': apiKey }
  ];

  const endpoints = [
    '/api/users',
    '/api/teams', 
    '/api/customers',
    '/api/projects',
    '/api/activities',
    '/api/users/me',
    '/api/timesheets?user=all&size=1',
    '/api/config'
  ];

  console.log('Testing Kimai API endpoints with new key...\n');
  
  // Test with different headers
  for (const [idx, headers] of authHeaders.entries()) {
    const headerType = idx === 0 ? 'Bearer' : 'X-AUTH-TOKEN';
    console.log(`\nTrying with ${headerType} header:`);
    
    const testEndpoint = '/api/users/me';
    try {
      const response = await axios.get(`${baseUrl}${testEndpoint}`, { headers });
      console.log(`✅ Authentication works with ${headerType}!`);
      console.log(`   Current user: ${response.data.username || response.data.alias || 'ID: ' + response.data.id}`);
      
      // Use this header for all tests
      const workingHeaders = headers;
      console.log('\nTesting all endpoints:');
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${baseUrl}${endpoint}`, { headers: workingHeaders });
          console.log(`✅ ${endpoint} - Status: ${response.status}`);
          
          if (endpoint === '/api/users/me') {
            console.log('   Current user:', response.data.username || response.data.alias || 'ID: ' + response.data.id);
          } else if (Array.isArray(response.data)) {
            console.log(`   Found ${response.data.length} items`);
          }
        } catch (error) {
          console.log(`❌ ${endpoint} - ${error.response?.status || error.message}`);
        }
      }
      break; // Stop after finding working header
    } catch (error) {
      console.log(`❌ ${headerType} failed: ${error.response?.status || error.message}`);
    }
  }
}

testEndpoints();