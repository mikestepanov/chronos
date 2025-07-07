#!/usr/bin/env node

const UserMapping = require('../services/UserMapping');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (question) => new Promise(resolve => rl.question(question, resolve));

async function main() {
  const mappingFile = path.join(__dirname, '../config/user-mapping.csv');
  const userMapping = new UserMapping(mappingFile);
  
  try {
    await userMapping.load();
    console.log('\n📋 Kimai User Mapping Manager');
    console.log('=' .repeat(50));
    
    while (true) {
      console.log('\nOptions:');
      console.log('1. List all users');
      console.log('2. Add/Update user');
      console.log('3. Find user');
      console.log('4. Check unmapped Kimai IDs');
      console.log('5. Export mapping');
      console.log('6. Exit');
      
      const choice = await prompt('\nSelect option (1-6): ');
      
      switch (choice.trim()) {
        case '1':
          await listUsers(userMapping);
          break;
          
        case '2':
          await addUpdateUser(userMapping);
          break;
          
        case '3':
          await findUser(userMapping);
          break;
          
        case '4':
          await checkUnmapped(userMapping);
          break;
          
        case '5':
          await exportMapping(userMapping);
          break;
          
        case '6':
          console.log('\nGoodbye!');
          rl.close();
          return;
          
        default:
          console.log('Invalid option');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    rl.close();
  }
}

async function listUsers(userMapping) {
  console.log('\n📋 Current User Mappings:');
  console.log('-'.repeat(80));
  console.log('Kimai ID | Name                  | Email                      | Pumble ID | Active');
  console.log('-'.repeat(80));
  
  const users = userMapping.getActiveUsers();
  users.forEach(user => {
    const pumbleStatus = user.pumbleId === 'PUMBLE_ID_HERE' ? '❌ MISSING' : '✅';
    console.log(`${user.kimaiId.toString().padEnd(8)} | ${user.name.padEnd(20)} | ${user.email.padEnd(25)} | ${pumbleStatus.padEnd(9)} | ${user.active ? 'Yes' : 'No'}`);
  });
  
  console.log(`\nTotal: ${users.length} users`);
}

async function addUpdateUser(userMapping) {
  console.log('\n➕ Add/Update User Mapping');
  
  const kimaiId = await prompt('Kimai User ID: ');
  const name = await prompt('Full Name: ');
  const email = await prompt('Email: ');
  const pumbleId = await prompt('Pumble ID (or press Enter to skip): ');
  const activeStr = await prompt('Active? (y/n) [y]: ');
  
  const active = activeStr.toLowerCase() !== 'n';
  
  await userMapping.addUser(
    kimaiId,
    name,
    email,
    pumbleId || 'PUMBLE_ID_HERE',
    active
  );
  
  console.log('✅ User mapping saved!');
}

async function findUser(userMapping) {
  console.log('\n🔍 Find User');
  
  const search = await prompt('Enter Kimai ID, name, email, or Pumble ID: ');
  
  let user = null;
  
  // Try different lookup methods
  if (/^\d+$/.test(search)) {
    user = userMapping.getByKimaiId(parseInt(search));
  }
  
  if (!user && search.includes('@')) {
    user = userMapping.getByEmail(search);
  }
  
  if (!user) {
    user = userMapping.getByName(search);
  }
  
  if (!user) {
    user = userMapping.getByPumbleId(search);
  }
  
  if (user) {
    console.log('\n✅ User found:');
    console.log(`  Kimai ID: ${user.kimaiId}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Pumble ID: ${user.pumbleId}`);
    console.log(`  Active: ${user.active ? 'Yes' : 'No'}`);
  } else {
    console.log('❌ User not found');
  }
}

async function checkUnmapped(userMapping) {
  console.log('\n🔍 Checking for unmapped Kimai IDs in recent data...');
  
  const KimaiAPI = require('../services/KimaiAPI');
  const api = new KimaiAPI({
    baseUrl: process.env.KIMAI_URL || 'https://kimai.starthub.academy',
    apiKey: process.env.KIMAI_API_KEY
  });
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const timesheets = await api.getTimesheets(startDate, endDate);
  const kimaiIds = new Set();
  
  timesheets.forEach(entry => {
    if (entry.user) {
      const id = typeof entry.user === 'object' ? entry.user.id : parseInt(entry.user);
      if (id) kimaiIds.add(id);
    }
  });
  
  const unmapped = [];
  kimaiIds.forEach(id => {
    if (!userMapping.getByKimaiId(id)) {
      unmapped.push(id);
    }
  });
  
  if (unmapped.length > 0) {
    console.log(`\n❌ Found ${unmapped.length} unmapped Kimai IDs:`);
    unmapped.forEach(id => console.log(`  - User ${id}`));
    console.log('\nUse option 2 to add these users.');
  } else {
    console.log('\n✅ All Kimai IDs are mapped!');
  }
}

async function exportMapping(userMapping) {
  console.log('\n📤 Export User Mapping');
  console.log('\nCurrent mapping file:', userMapping.mappingFile);
  
  const users = userMapping.getActiveUsers();
  console.log(`\nExporting ${users.length} users...`);
  
  // Create Pumble employee mapping format
  const pumbleMappings = users
    .filter(u => u.pumbleId && u.pumbleId !== 'PUMBLE_ID_HERE')
    .map(u => `${u.email}:${u.pumbleId}`)
    .join(',');
  
  console.log('\n📋 Pumble Employee Mapping (for .env):');
  console.log(`EMPLOYEE_MAPPING=${pumbleMappings}`);
  
  console.log('\n✅ Export complete!');
}

// Run the manager
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
main().catch(console.error);