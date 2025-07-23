#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios = require('axios');

async function fetchUsers() {
  const baseUrl = process.env.KIMAI_URL || 'https://kimai.starthub.academy';
  const apiKey = process.env.KIMAI_API_KEY;

  try {
    // Try to fetch users
    const response = await axios.get(`${baseUrl}/api/users`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    console.log(`Found ${response.data.length} users:\n`);
    
    response.data.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Alias: ${user.alias || 'N/A'}`);
      console.log(`Email: ${user.email || 'N/A'}`);
      console.log(`Enabled: ${user.enabled}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error fetching users:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

fetchUsers();