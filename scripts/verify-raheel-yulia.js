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

function analyzeUserHours(records, userName) {
  const userEntries = records.filter(r => 
    r.User === userName || r.Name === userName || 
    (r.Name && r.Name.includes(userName)) ||
    (r.User && r.User.includes(userName))
  );
  
  let totalHours = 0;
  console.log(`\n${userName} entries:`);
  console.log('='.repeat(80));
  
  userEntries.forEach(entry => {
    const hours = parseDuration(entry.Duration);
    totalHours += hours;
    console.log(`${entry.Date} | ${entry.From}-${entry.To} | ${entry.Duration} (${hours.toFixed(2)}h) | ${entry.Activity}`);
  });
  
  console.log('-'.repeat(80));
  console.log(`Total: ${totalHours.toFixed(2)} hours`);
  
  return totalHours;
}

// Load both CSV files
console.log('\n=== ANALYZING 09 FILE ===');
const csv09 = parseCSV('20250709-kimai-export.csv');
const raheel09 = analyzeUserHours(csv09, 'raheel');
const yulia09 = analyzeUserHours(csv09, 'Yulia');

console.log('\n\n=== ANALYZING 10 FILE ===');
const csv10 = parseCSV('20250710-kimai-export.csv');
const raheel10 = analyzeUserHours(csv10, 'raheel');
const yulia10 = analyzeUserHours(csv10, 'Yulia');

console.log('\n\n=== SUMMARY ===');
console.log(`Raheel: ${raheel09.toFixed(2)}h (09 file) vs ${raheel10.toFixed(2)}h (10 file) - Difference: ${(raheel10 - raheel09).toFixed(2)}h`);
console.log(`Yulia:  ${yulia09.toFixed(2)}h (09 file) vs ${yulia10.toFixed(2)}h (10 file) - Difference: ${(yulia10 - yulia09).toFixed(2)}h`);

// Also check if there are any entries with "Raheel Shahzad" vs just "raheel"
console.log('\n\n=== CHECKING NAME VARIATIONS ===');
const raheelVariations09 = csv09.filter(r => 
  r.User === 'raheel' || r.Name === 'Raheel Shahzad' || 
  (r.Name && r.Name.toLowerCase().includes('raheel')) ||
  (r.User && r.User.toLowerCase().includes('raheel'))
);

const raheelVariations10 = csv10.filter(r => 
  r.User === 'raheel' || r.Name === 'Raheel Shahzad' || 
  (r.Name && r.Name.toLowerCase().includes('raheel')) ||
  (r.User && r.User.toLowerCase().includes('raheel'))
);

console.log(`\nRaheel entries in 09: ${raheelVariations09.length}`);
console.log(`Raheel entries in 10: ${raheelVariations10.length}`);

// Group by how the name appears
const nameGroups09 = {};
const nameGroups10 = {};

raheelVariations09.forEach(r => {
  const key = `User: "${r.User}", Name: "${r.Name}"`;
  nameGroups09[key] = (nameGroups09[key] || 0) + 1;
});

raheelVariations10.forEach(r => {
  const key = `User: "${r.User}", Name: "${r.Name}"`;
  nameGroups10[key] = (nameGroups10[key] || 0) + 1;
});

console.log('\n09 file name variations:');
Object.entries(nameGroups09).forEach(([key, count]) => {
  console.log(`  ${key}: ${count} entries`);
});

console.log('\n10 file name variations:');
Object.entries(nameGroups10).forEach(([key, count]) => {
  console.log(`  ${key}: ${count} entries`);
});