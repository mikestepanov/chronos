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

// Check both files
['20250709-kimai-export.csv', '20250710-kimai-export.csv'].forEach(filename => {
  console.log(`\n\n=== ANALYZING ${filename} ===`);
  
  const records = parseCSV(filename);
  const yuliaEntries = records.filter(r => r.User === 'Yulia' || r.Name === 'Yulia');
  
  console.log(`\nFound ${yuliaEntries.length} Yulia entries:`);
  console.log('='.repeat(100));
  
  let total = 0;
  yuliaEntries.forEach((entry, idx) => {
    const hours = parseDuration(entry.Duration);
    total += hours;
    console.log(`${idx + 1}. ${entry.Date} | ${entry.From}-${entry.To} | ${entry.Duration} (${hours.toFixed(2)}h) | ${entry.Project} | ${entry.Activity}`);
  });
  
  console.log('-'.repeat(100));
  console.log(`Total: ${total.toFixed(2)} hours`);
  
  // Check for potential duplicates
  console.log('\n\nChecking for potential duplicate entries...');
  for (let i = 0; i < yuliaEntries.length; i++) {
    for (let j = i + 1; j < yuliaEntries.length; j++) {
      if (yuliaEntries[i].Date === yuliaEntries[j].Date &&
          yuliaEntries[i].From === yuliaEntries[j].From &&
          yuliaEntries[i].To === yuliaEntries[j].To) {
        console.log(`\nPotential duplicate found:`);
        console.log(`Entry ${i + 1}: ${yuliaEntries[i].Date} ${yuliaEntries[i].From}-${yuliaEntries[i].To} "${yuliaEntries[i].Description}"`);
        console.log(`Entry ${j + 1}: ${yuliaEntries[j].Date} ${yuliaEntries[j].From}-${yuliaEntries[j].To} "${yuliaEntries[j].Description}"`);
      }
    }
  }
});

// Let's also check the hours report file in kimai-data
console.log('\n\n=== CHECKING EXISTING HOURS REPORT ===');
try {
  const existingReport = fs.readFileSync('/home/mstepanov/Documents/GitHub/chronos/kimai-data/2025-06-24/hours-report.txt', 'utf-8');
  console.log('Content of existing hours report:');
  console.log(existingReport);
} catch (err) {
  console.log('Could not read existing hours report:', err.message);
}