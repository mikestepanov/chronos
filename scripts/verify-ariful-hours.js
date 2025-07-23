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

// Load the CSV file
const records = parseCSV('20250710-kimai-export.csv');

// Find all ariful entries
const arifulEntries = records.filter(r => 
  r.User === 'ariful' || 
  r.Name === 'ariful' || 
  (r.User && r.User.toLowerCase().includes('ariful')) ||
  (r.Name && r.Name.toLowerCase().includes('ariful'))
);

console.log(`Found ${arifulEntries.length} ariful entries in 20250710-kimai-export.csv:\n`);
console.log('Date       | From  | To    | Duration | Hours  | Project                | Activity');
console.log('-----------|-------|-------|----------|--------|------------------------|----------');

let totalHours = 0;
arifulEntries.forEach((entry, idx) => {
  const hours = parseDuration(entry.Duration);
  totalHours += hours;
  console.log(
    `${entry.Date} | ${entry.From} | ${entry.To} | ${entry.Duration.padEnd(8)} | ${hours.toFixed(2).padStart(6)} | ${entry.Project.padEnd(22)} | ${entry.Activity}`
  );
});

console.log('-'.repeat(90));
console.log(`TOTAL: ${totalHours.toFixed(2)} hours`);

// Let's also check if there are any other variations
console.log('\n\nChecking for any other potential ariful entries with different spellings...');
const allUsers = [...new Set(records.map(r => r.User))].sort();
console.log('\nAll unique users in the file:');
allUsers.forEach(user => {
  if (user) console.log(`- "${user}"`);
});