const fs = require('fs');
const csv = require('csv-parse/sync');

// Read the CSV file
const csvContent = fs.readFileSync('/home/mstepanov/Documents/GitHub/chronos/20250709-kimai-export.csv', 'utf-8');
const records = csv.parse(csvContent, {
  columns: true,
  skip_empty_lines: true
});

// Define pay period
const startDate = new Date('2025-06-24');
const endDate = new Date('2025-07-07');
endDate.setHours(23, 59, 59, 999); // End of day

// Function to parse duration string (e.g., "7:30") to decimal hours
function parseDuration(duration) {
  const parts = duration.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  return hours + (minutes / 60);
}

// Filter records within pay period and calculate hours by user
const userHours = {};

records.forEach(record => {
  const recordDate = new Date(record.Date);
  
  // Check if record is within pay period
  if (recordDate >= startDate && recordDate <= endDate) {
    const user = record.User;
    const hours = parseDuration(record.Duration);
    
    if (!userHours[user]) {
      userHours[user] = 0;
    }
    userHours[user] += hours;
  }
});

// Sort users and display results
const sortedUsers = Object.entries(userHours)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([user, hours]) => ({
    user,
    hours: hours.toFixed(2)
  }));

console.log('\nHours Report for Pay Period June 24 - July 7, 2025:');
console.log('='.repeat(50));

sortedUsers.forEach(({ user, hours }) => {
  console.log(`${user.padEnd(25)} ${hours.padStart(8)} hours`);
});

console.log('\n\nSpecific users of interest:');
console.log('-'.repeat(30));
console.log(`Ariful:      ${userHours['ariful']?.toFixed(2) || '0.00'} hours`);
console.log(`Mori Isaac:  ${userHours['Mori']?.toFixed(2) || '0.00'} hours`);
console.log(`Eddy:        ${userHours['eddy']?.toFixed(2) || '0.00'} hours`);

// Let's also check specific entries for these users
console.log('\n\nDetailed breakdown for Ariful:');
console.log('-'.repeat(50));
records.forEach(record => {
  const recordDate = new Date(record.Date);
  if (recordDate >= startDate && recordDate <= endDate && record.User === 'ariful') {
    console.log(`${record.Date} | ${record.From}-${record.To} | ${record.Duration} | ${record.Activity}`);
  }
});

console.log('\n\nDetailed breakdown for Mori Isaac:');
console.log('-'.repeat(50));
records.forEach(record => {
  const recordDate = new Date(record.Date);
  if (recordDate >= startDate && recordDate <= endDate && record.User === 'Mori') {
    console.log(`${record.Date} | ${record.From}-${record.To} | ${record.Duration} | ${record.Activity}`);
  }
});

console.log('\n\nDetailed breakdown for Eddy:');
console.log('-'.repeat(50));
records.forEach(record => {
  const recordDate = new Date(record.Date);
  if (recordDate >= startDate && recordDate <= endDate && record.User === 'eddy') {
    console.log(`${record.Date} | ${record.From}-${record.To} | ${record.Duration} | ${record.Activity}`);
  }
});