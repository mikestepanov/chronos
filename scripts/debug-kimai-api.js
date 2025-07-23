const KimaiAPI = require('./kimai/services/KimaiAPI');
require('dotenv').config();

async function debugKimaiData() {
  const config = {
    baseUrl: process.env.KIMAI_URL || 'https://kimai.starthub.academy',
    apiKey: process.env.KIMAI_API_KEY,
    username: process.env.KIMAI_USERNAME,
    password: process.env.KIMAI_PASSWORD
  };

  const client = new KimaiAPI(config);
  
  // Define pay period
  const startDate = new Date('2025-06-24');
  const endDate = new Date('2025-07-07');
  
  try {
    // Get timesheets from API
    console.log('Fetching timesheets from Kimai API...');
    const timesheets = await client.getTimesheets(startDate, endDate);
    
    // Calculate hours by user ID
    const userHours = {};
    timesheets.forEach(entry => {
      const userId = entry.user;
      if (!userHours[userId]) {
        userHours[userId] = {
          seconds: 0,
          hours: 0,
          entries: []
        };
      }
      userHours[userId].seconds += entry.duration;
      userHours[userId].hours = userHours[userId].seconds / 3600;
      userHours[userId].entries.push({
        date: entry.begin,
        duration: entry.duration,
        durationHours: entry.duration / 3600,
        activity: entry.activity?.name || 'Unknown'
      });
    });
    
    console.log('\n=== Hours by User ID ===');
    Object.entries(userHours).forEach(([userId, data]) => {
      console.log(`\nUser ID ${userId}: ${data.hours.toFixed(2)} hours`);
      console.log(`Total entries: ${data.entries.length}`);
    });
    
    // Map to names using users.json
    const fs = require('fs');
    const users = JSON.parse(fs.readFileSync('./config/users/users.json', 'utf8'));
    
    console.log('\n\n=== Hours by User Name ===');
    users.users.forEach(user => {
      if (user.services.kimai) {
        const kimaiId = user.services.kimai.id;
        const hours = userHours[kimaiId];
        if (hours) {
          console.log(`${user.name} (ID: ${kimaiId}): ${hours.hours.toFixed(2)} hours`);
        }
      }
    });
    
    // Check specific users
    console.log('\n\n=== Specific Users ===');
    const arifulId = 8;
    const moriId = 9;
    const eddyId = 7;
    
    console.log(`Ariful (ID ${arifulId}): ${userHours[arifulId]?.hours.toFixed(2) || '0.00'} hours`);
    console.log(`Mori Isaac (ID ${moriId}): ${userHours[moriId]?.hours.toFixed(2) || '0.00'} hours`);
    console.log(`Eddy (ID ${eddyId}): ${userHours[eddyId]?.hours.toFixed(2) || '0.00'} hours`);
    
    // Show some entries for Ariful
    if (userHours[arifulId]) {
      console.log('\n\nSample entries for Ariful:');
      userHours[arifulId].entries.slice(0, 5).forEach(entry => {
        console.log(`  ${new Date(entry.date).toLocaleDateString()} - ${entry.durationHours.toFixed(2)} hours - ${entry.activity}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugKimaiData();