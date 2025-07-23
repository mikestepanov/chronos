const fs = require('fs');
const csv = require('csv-parse/sync');

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

// Parse duration string to decimal hours
function parseDuration(duration) {
  const parts = duration.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  return hours + (minutes / 60);
}

// Calculate hours by user
const userHours = {};
const userEntries = {};

// Check the first record in the pay period
for (const record of csvRecords) {
  const recordDate = new Date(record.Date);
  if (recordDate >= startDate && recordDate <= endDate) {
    // The User field appears to be in the 10th column, let's check the actual field name
    console.log('CSV Column names:', Object.keys(record));
    console.log('Sample record:', record);
    break;
  }
}

// Now parse correctly
csvRecords.forEach(record => {
  const recordDate = new Date(record.Date);
  if (recordDate >= startDate && recordDate <= endDate) {
    const user = record.User; // This is the correct field name
    const hours = parseDuration(record.Duration);
    
    if (!userHours[user]) {
      userHours[user] = 0;
      userEntries[user] = [];
    }
    userHours[user] += hours;
    userEntries[user].push({
      date: record.Date,
      duration: record.Duration,
      hours: hours,
      activity: record.Activity
    });
  }
});

console.log('\n\nHours by User from CSV:');
console.log('='.repeat(50));
Object.entries(userHours)
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([user, hours]) => {
    console.log(`${user.padEnd(25)} ${hours.toFixed(2).padStart(8)} hours (${userEntries[user].length} entries)`);
  });

// Focus on specific users
console.log('\n\nSpecific users:');
console.log('-'.repeat(30));
console.log(`ariful:      ${userHours['ariful']?.toFixed(2) || '0.00'} hours`);
console.log(`Mori:        ${userHours['Mori']?.toFixed(2) || '0.00'} hours`);
console.log(`eddy:        ${userHours['eddy']?.toFixed(2) || '0.00'} hours`);

// Check Mori vs "Mori Isaac"
console.log('\n\nChecking user name variations:');
const moriVariations = Object.keys(userHours).filter(user => user.toLowerCase().includes('mori'));
console.log('Mori variations found:', moriVariations);

// Show Ariful's entries
console.log('\n\nAriful entries from CSV:');
if (userEntries['ariful']) {
  userEntries['ariful'].forEach(entry => {
    console.log(`  ${entry.date} - ${entry.duration} (${entry.hours.toFixed(2)} hours) - ${entry.activity}`);
  });
  console.log(`\nTotal: ${userHours['ariful'].toFixed(2)} hours`);
}