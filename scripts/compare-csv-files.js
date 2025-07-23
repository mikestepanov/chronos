const fs = require('fs');
const csv = require('csv-parse/sync');

function parseCSV(filename) {
  const content = fs.readFileSync(filename, 'utf-8');
  return csv.parse(content, { 
    columns: true,
    skip_empty_lines: true
  });
}

function parseDuration(duration) {
  const [hours, minutes] = duration.split(':').map(Number);
  return hours + minutes / 60;
}

function summarizeByUser(records) {
  const userHours = {};
  
  records.forEach(record => {
    const user = record.User || record.Name;
    const hours = parseDuration(record.Duration);
    
    if (!userHours[user]) {
      userHours[user] = 0;
    }
    userHours[user] += hours;
  });
  
  return userHours;
}

// Load both CSV files
const csv09 = parseCSV('20250709-kimai-export.csv');
const csv10 = parseCSV('20250710-kimai-export.csv');

console.log(`\n09 file has ${csv09.length} entries`);
console.log(`10 file has ${csv10.length} entries`);
console.log(`Difference: ${csv10.length - csv09.length} more entries in 10 file\n`);

// Get hours by user for each file
const hours09 = summarizeByUser(csv09);
const hours10 = summarizeByUser(csv10);

// Get all unique users
const allUsers = new Set([...Object.keys(hours09), ...Object.keys(hours10)]);

// Compare and display
console.log('User Hours Comparison:');
console.log('='.repeat(60));
console.log(`${'User'.padEnd(20)} | ${'09 File'.padStart(10)} | ${'10 File'.padStart(10)} | ${'Diff'.padStart(10)}`);
console.log('-'.repeat(60));

let total09 = 0;
let total10 = 0;

Array.from(allUsers).sort().forEach(user => {
  const h09 = hours09[user] || 0;
  const h10 = hours10[user] || 0;
  const diff = h10 - h09;
  
  total09 += h09;
  total10 += h10;
  
  console.log(`${user.padEnd(20)} | ${h09.toFixed(2).padStart(10)} | ${h10.toFixed(2).padStart(10)} | ${diff > 0 ? '+' : ''}${diff.toFixed(2).padStart(9)}`);
});

console.log('-'.repeat(60));
console.log(`${'TOTAL'.padEnd(20)} | ${total09.toFixed(2).padStart(10)} | ${total10.toFixed(2).padStart(10)} | ${(total10 - total09).toFixed(2).padStart(10)}`);

// Find missing entries
console.log('\n\nFinding entries in 10 file that are not in 09 file...\n');

// Create a set of unique identifiers from 09 file
const entries09 = new Set(csv09.map(r => `${r.Date}|${r.From}|${r.To}|${r.User}|${r.Description}`));

// Find entries in 10 that are not in 09
const missingEntries = csv10.filter(r => {
  const key = `${r.Date}|${r.From}|${r.To}|${r.User}|${r.Description}`;
  return !entries09.has(key);
});

console.log(`Found ${missingEntries.length} entries in 10 file that are not in 09 file:\n`);

// Group missing entries by user
const missingByUser = {};
missingEntries.forEach(entry => {
  const user = entry.User;
  if (!missingByUser[user]) {
    missingByUser[user] = [];
  }
  missingByUser[user].push(entry);
});

// Display missing entries by user
Object.entries(missingByUser).forEach(([user, entries]) => {
  console.log(`\n${user} (${entries.length} missing entries):`);
  entries.forEach(entry => {
    console.log(`  - ${entry.Date} ${entry.From}-${entry.To} (${entry.Duration}) - ${entry.Activity} - ${entry.Description.substring(0, 50)}${entry.Description.length > 50 ? '...' : ''}`);
  });
});