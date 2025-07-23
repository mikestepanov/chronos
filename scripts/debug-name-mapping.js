const fs = require('fs');
const KimaiAPI = require('./kimai/services/KimaiAPI');
require('dotenv').config();

async function debugNameMapping() {
  // Load user configuration
  const users = JSON.parse(fs.readFileSync('./config/users/users.json', 'utf8'));
  
  console.log('=== User Configuration Mapping ===');
  console.log('Kimai ID -> Name:');
  users.users.forEach(user => {
    if (user.services.kimai) {
      console.log(`  ID ${user.services.kimai.id}: ${user.name} (username: ${user.services.kimai.username})`);
    }
  });
  
  // Get API data
  const config = {
    baseUrl: process.env.KIMAI_URL || 'https://kimai.starthub.academy',
    apiKey: process.env.KIMAI_API_KEY,
    username: process.env.KIMAI_USERNAME,
    password: process.env.KIMAI_PASSWORD
  };
  
  const client = new KimaiAPI(config);
  const startDate = new Date('2025-06-24');
  const endDate = new Date('2025-07-07');
  
  try {
    // Get users from API
    console.log('\n\n=== Kimai API Users ===');
    const apiUsers = await client.getUsers();
    
    // Sort by ID for easy comparison
    apiUsers.sort((a, b) => a.id - b.id);
    
    console.log('ID -> Username -> Display Name:');
    apiUsers.forEach(user => {
      console.log(`  ID ${user.id}: ${user.username} -> ${user.alias || user.displayName || 'N/A'}`);
    });
    
    // Compare specific users
    console.log('\n\n=== Specific User Comparison ===');
    const arifulConfig = users.users.find(u => u.id === 'ariful');
    const moriConfig = users.users.find(u => u.id === 'mori-isaac');
    
    console.log('\nAriful in config:');
    console.log(`  Config ID: ${arifulConfig.id}`);
    console.log(`  Kimai ID: ${arifulConfig.services.kimai.id}`);
    console.log(`  Username: ${arifulConfig.services.kimai.username}`);
    
    console.log('\nMori Isaac in config:');
    console.log(`  Config ID: ${moriConfig.id}`);
    console.log(`  Kimai ID: ${moriConfig.services.kimai.id}`);
    console.log(`  Username: ${moriConfig.services.kimai.username}`);
    
    // Find in API users
    const arifulAPI = apiUsers.find(u => u.id === arifulConfig.services.kimai.id);
    const moriAPI = apiUsers.find(u => u.id === moriConfig.services.kimai.id);
    
    console.log('\nAriful in API:');
    if (arifulAPI) {
      console.log(`  ID: ${arifulAPI.id}`);
      console.log(`  Username: ${arifulAPI.username}`);
      console.log(`  Alias/Display: ${arifulAPI.alias || arifulAPI.displayName || 'N/A'}`);
    } else {
      console.log('  NOT FOUND');
    }
    
    console.log('\nMori Isaac in API:');
    if (moriAPI) {
      console.log(`  ID: ${moriAPI.id}`);
      console.log(`  Username: ${moriAPI.username}`);  
      console.log(`  Alias/Display: ${moriAPI.alias || moriAPI.displayName || 'N/A'}`);
    } else {
      console.log('  NOT FOUND');
    }
    
    // Get timesheets to verify
    console.log('\n\n=== Timesheet Verification ===');
    const timesheets = await client.getTimesheets(startDate, endDate);
    
    const arifulHours = timesheets
      .filter(t => t.user === arifulConfig.services.kimai.id)
      .reduce((sum, t) => sum + t.duration / 3600, 0);
      
    const moriHours = timesheets
      .filter(t => t.user === moriConfig.services.kimai.id)
      .reduce((sum, t) => sum + t.duration / 3600, 0);
      
    console.log(`Ariful (ID ${arifulConfig.services.kimai.id}): ${arifulHours.toFixed(2)} hours from API`);
    console.log(`Mori Isaac (ID ${moriConfig.services.kimai.id}): ${moriHours.toFixed(2)} hours from API`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugNameMapping();