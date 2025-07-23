const fs = require('fs');
const csv = require('csv-parse/sync');
const KimaiAPI = require('./kimai/services/KimaiAPI');
require('dotenv').config();

async function compareData() {
  // Read CSV data
  const csvContent = fs.readFileSync('/home/mstepanov/Documents/GitHub/chronos/20250709-kimai-export.csv', 'utf-8');
  const csvRecords = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });
  
  // Define pay period
  const startDate = new Date('2025-06-24');
  const endDate = new Date('2025-07-07');
  endDate.setHours(23, 59, 59, 999);
  
  // Get API data
  const config = {
    baseUrl: process.env.KIMAI_URL || 'https://kimai.starthub.academy',
    apiKey: process.env.KIMAI_API_KEY,
    username: process.env.KIMAI_USERNAME,
    password: process.env.KIMAI_PASSWORD
  };
  const client = new KimaiAPI(config);
  const apiTimesheets = await client.getTimesheets(startDate, endDate);
  
  // Parse duration string to decimal hours
  function parseDuration(duration) {
    const parts = duration.split(':');
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    return hours + (minutes / 60);
  }
  
  // Calculate CSV hours by user
  const csvUserHours = {};
  csvRecords.forEach(record => {
    const recordDate = new Date(record.Date);
    if (recordDate >= startDate && recordDate <= endDate) {
      const user = record.User;
      const hours = parseDuration(record.Duration);
      if (!csvUserHours[user]) {
        csvUserHours[user] = 0;
      }
      csvUserHours[user] += hours;
    }
  });
  
  // Calculate API hours by user (need to map IDs to names)
  const apiUserHours = {};
  const users = JSON.parse(fs.readFileSync('./config/users/users.json', 'utf8'));
  const idToName = {};
  users.users.forEach(user => {
    if (user.services.kimai) {
      idToName[user.services.kimai.id] = user.name;
    }
  });
  
  apiTimesheets.forEach(entry => {
    const userName = idToName[entry.user] || `Unknown User ${entry.user}`;
    if (!apiUserHours[userName]) {
      apiUserHours[userName] = 0;
    }
    apiUserHours[userName] += entry.duration / 3600;
  });
  
  // Compare specific users
  console.log('=== Hours Comparison: CSV vs API ===\n');
  console.log('User                     CSV Hours    API Hours    Difference');
  console.log('---------------------------------------------------------------');
  
  const compareUsers = ['Ariful', 'Mori Isaac', 'Eddy', 'Dharam Pal Singh', 'Raheel Shahzad', 'Pauline Nguyen', 'Yulia'];
  
  compareUsers.forEach(userName => {
    const csvHours = csvUserHours[userName] || csvUserHours[userName.toLowerCase()] || 0;
    const apiHours = apiUserHours[userName] || 0;
    const diff = apiHours - csvHours;
    console.log(`${userName.padEnd(24)} ${csvHours.toFixed(2).padStart(8)}    ${apiHours.toFixed(2).padStart(8)}    ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`);
  });
  
  // Check for extra entries in API
  console.log('\n\n=== API Timesheet Count vs CSV Count ===');
  console.log(`API total entries: ${apiTimesheets.length}`);
  console.log(`CSV total entries in period: ${csvRecords.filter(r => {
    const d = new Date(r.Date);
    return d >= startDate && d <= endDate;
  }).length}`);
  
  // Look for specific Ariful entries
  console.log('\n\n=== Ariful API Entries Details ===');
  const arifulEntries = apiTimesheets.filter(entry => entry.user === 8); // Ariful's ID is 8
  console.log(`Total Ariful entries from API: ${arifulEntries.length}`);
  console.log(`Total hours: ${(arifulEntries.reduce((sum, e) => sum + e.duration, 0) / 3600).toFixed(2)}`);
  
  // Show dates of Ariful's entries
  console.log('\nAriful entries by date:');
  const dateGroups = {};
  arifulEntries.forEach(entry => {
    const date = new Date(entry.begin).toLocaleDateString();
    if (!dateGroups[date]) {
      dateGroups[date] = { count: 0, hours: 0 };
    }
    dateGroups[date].count++;
    dateGroups[date].hours += entry.duration / 3600;
  });
  
  Object.entries(dateGroups).sort().forEach(([date, data]) => {
    console.log(`  ${date}: ${data.count} entries, ${data.hours.toFixed(2)} hours`);
  });
}

compareData().catch(console.error);