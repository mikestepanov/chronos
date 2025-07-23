require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

console.log('Testing .env loading...');
console.log('KIMAI_URL:', process.env.KIMAI_URL);
console.log('KIMAI_API_KEY:', process.env.KIMAI_API_KEY);
console.log('API Key length:', process.env.KIMAI_API_KEY?.length);

// Test the API
const axios = require('axios');

async function testAuth() {
  const url = process.env.KIMAI_URL;
  const apiKey = process.env.KIMAI_API_KEY;
  
  if (!apiKey) {
    console.error('No API key found!');
    return;
  }
  
  console.log('\nTesting API authentication...');
  
  // Try both headers
  const tests = [
    { name: 'Bearer', headers: { 'Authorization': `Bearer ${apiKey}` } },
    { name: 'X-AUTH-TOKEN', headers: { 'X-AUTH-TOKEN': apiKey } },
    { name: 'X-AUTH-USER', headers: { 'X-AUTH-USER': 'mikhail', 'X-AUTH-TOKEN': apiKey } }
  ];
  
  for (const test of tests) {
    try {
      console.log(`\nTrying ${test.name}...`);
      const response = await axios.get(`${url}/api/users/me`, { headers: test.headers });
      console.log('✅ SUCCESS!');
      console.log('User:', response.data.username);
      console.log('ID:', response.data.id);
      return;
    } catch (error) {
      console.log(`❌ Failed: ${error.response?.status} ${error.response?.statusText}`);
      if (error.response?.data) {
        console.log('Error:', JSON.stringify(error.response.data));
      }
    }
  }
}

testAuth();