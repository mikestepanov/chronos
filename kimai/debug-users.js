#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const KimaiAPI = require('./services/KimaiAPI');
const { format } = require('date-fns');

async function debugUsers() {
  const api = new KimaiAPI({
    baseUrl: process.env.KIMAI_URL || 'https://kimai.starthub.academy',
    apiKey: process.env.KIMAI_API_KEY
  });

  try {
    // Get recent timesheets
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log('Fetching timesheets from', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));
    
    const timesheets = await api.getTimesheets(startDate, endDate);
    
    console.log(`\nFound ${timesheets.length} timesheets`);
    
    // Show first few entries with COMPLETE data
    console.log('\nFirst 3 entries (COMPLETE RAW DATA):');
    timesheets.slice(0, 3).forEach((entry, i) => {
      console.log(`\n========== Entry ${i + 1} ==========`);
      console.log(JSON.stringify(entry, null, 2));
    });

    // Show unique users
    const users = new Map();
    timesheets.forEach(entry => {
      if (entry.user) {
        const key = entry.user.id || entry.user.username || 'unknown';
        users.set(key, entry.user);
      }
    });

    console.log(`\n\nUnique users found: ${users.size}`);
    users.forEach((user, key) => {
      console.log(`- ${user.alias || user.username || key}: ${JSON.stringify(user)}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

debugUsers();