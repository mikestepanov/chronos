const fs = require('fs');
const csv = require('csv-parse/sync');
const KimaiAPI = require('./kimai/services/KimaiAPI');
require('dotenv').config();

async function finalAnalysis() {
  // Configuration
  const users = JSON.parse(fs.readFileSync('./config/users/users.json', 'utf8'));
  const config = {
    baseUrl: process.env.KIMAI_URL || 'https://kimai.starthub.academy',
    apiKey: process.env.KIMAI_API_KEY,
    username: process.env.KIMAI_USERNAME,
    password: process.env.KIMAI_PASSWORD
  };
  
  const client = new KimaiAPI(config);
  const startDate = new Date('2025-06-24');
  const endDate = new Date('2025-07-07');
  
  // Get API timesheets
  console.log('Fetching data from Kimai API...');
  const apiTimesheets = await client.getTimesheets(startDate, endDate);
  
  // Process API data
  const apiHoursByKimaiId = {};
  apiTimesheets.forEach(entry => {
    const kimaiId = entry.user;
    if (!apiHoursByKimaiId[kimaiId]) {
      apiHoursByKimaiId[kimaiId] = 0;
    }
    apiHoursByKimaiId[kimaiId] += entry.duration / 3600;
  });
  
  // Read and process CSV
  const csvContent = fs.readFileSync('/home/mstepanov/Documents/GitHub/chronos/20250709-kimai-export.csv', 'utf-8');
  const csvRecords = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });
  
  // Parse duration
  function parseDuration(duration) {
    const parts = duration.split(':');
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    return hours + (minutes / 60);
  }
  
  // Process CSV data by username
  const csvHoursByUsername = {};
  csvRecords.forEach(record => {
    const recordDate = new Date(record.Date);
    if (recordDate >= startDate && recordDate <= endDate) {
      const username = record.User; // This is the username in CSV
      const hours = parseDuration(record.Duration);
      if (!csvHoursByUsername[username]) {
        csvHoursByUsername[username] = 0;
      }
      csvHoursByUsername[username] += hours;
    }
  });
  
  // Create comparison table
  console.log('\n=== COMPLETE COMPARISON: Config vs API vs CSV ===\n');
  console.log('Name in Config        | Kimai ID | Username | API Hours | CSV Hours | Difference');
  console.log('-'.repeat(85));
  
  users.users.forEach(user => {
    if (user.services.kimai && user.active) {
      const kimaiId = user.services.kimai.id;
      const username = user.services.kimai.username;
      const apiHours = apiHoursByKimaiId[kimaiId] || 0;
      const csvHours = csvHoursByUsername[username] || 0;
      const diff = apiHours - csvHours;
      
      console.log(
        `${user.name.padEnd(20)} | ${String(kimaiId).padStart(8)} | ${username.padEnd(8)} | ${apiHours.toFixed(2).padStart(9)} | ${csvHours.toFixed(2).padStart(9)} | ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`
      );
    }
  });
  
  // What the kimai-hours-report.js shows vs reality
  console.log('\n\n=== WHAT THE REPORT SHOWS vs ACTUAL DATA ===\n');
  console.log('The kimai-hours-report.js script shows:');
  console.log('  Ariful: 81.00 hours');
  console.log('  Mori Isaac: 66.00 hours');
  console.log('  Eddy: 22.37 hours');
  
  console.log('\nBut the actual data is:');
  console.log(`  Ariful (ID 8, username 'ariful'):`);
  console.log(`    - API: ${apiHoursByKimaiId[8]?.toFixed(2) || '0.00'} hours`);
  console.log(`    - CSV: ${csvHoursByUsername['ariful']?.toFixed(2) || '0.00'} hours`);
  
  console.log(`  Mori Isaac (ID 9, username 'mori'):`);
  console.log(`    - API: ${apiHoursByKimaiId[9]?.toFixed(2) || '0.00'} hours`);
  console.log(`    - CSV: ${csvHoursByUsername['Mori']?.toFixed(2) || '0.00'} hours`);
  
  console.log(`  Eddy (ID 7, username 'eddy'):`);
  console.log(`    - API: ${apiHoursByKimaiId[7]?.toFixed(2) || '0.00'} hours`);
  console.log(`    - CSV: ${csvHoursByUsername['eddy']?.toFixed(2) || '0.00'} hours`);
  
  // Check if usernames in CSV match expected
  console.log('\n\n=== CSV Username Check ===');
  console.log('Usernames found in CSV for this pay period:');
  const csvUsernames = [...new Set(csvRecords
    .filter(r => new Date(r.Date) >= startDate && new Date(r.Date) <= endDate)
    .map(r => r.User))].sort();
  csvUsernames.forEach(u => {
    console.log(`  "${u}"`);
  });
  
  // The issue might be case sensitivity or the CSV using display names
  console.log('\n\n=== POSSIBLE ISSUE: CSV Username Mismatch ===');
  console.log('The CSV might be using display names instead of usernames!');
  console.log('CSV "User" column shows: "Mori" (not "mori")');
  console.log('This explains why CSV parsing shows different hours.');
}

finalAnalysis().catch(console.error);