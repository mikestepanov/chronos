#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const HoursReportGenerator = require('./kimai/services/HoursReportGenerator');

// Load config
const config = {
  users: JSON.parse(fs.readFileSync('./config/users/users.json', 'utf8'))
};

// Parse the hours report to extract data
function parseHoursReport(reportPath, periodNumber) {
  const content = fs.readFileSync(reportPath, 'utf8');
  const lines = content.split('\n');
  
  // Extract period info
  const periodLine = lines.find(l => l.startsWith('Period:'));
  const [startStr, endStr] = periodLine.split(': ')[1].split(' - ');
  
  // Parse users from table
  const users = [];
  let inTable = false;
  
  for (const line of lines) {
    if (line.includes('| User') && line.includes('| Hours Worked')) {
      inTable = true;
      continue;
    }
    if (inTable && line.includes('|') && !line.includes('---')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 5 && parts[0] !== 'User') {
        const [user, hoursWorked, expected, difference, deviation, status] = parts;
        users.push({
          user: user,
          hoursWorked: parseFloat(hoursWorked),
          expectedHours: parseFloat(expected),
          difference: parseFloat(difference.replace('+', '')),
          percentDeviation: deviation.replace('%', '').replace('+', ''),
          status: status === '✓'
        });
      }
    }
    if (inTable && line.trim() === '') {
      break;
    }
  }
  
  // Create pay period object
  const payPeriod = {
    number: periodNumber,
    start: new Date(startStr + ', 2025'),
    end: new Date(endStr + ', 2025')
  };
  
  return { users, payPeriod };
}

// Main
const periodNumber = process.argv[2];
const reportPath = `./kimai-data/${periodNumber}/hours-report.txt`;

if (!periodNumber || !fs.existsSync(reportPath)) {
  console.error('Usage: node generate-csv-from-existing.js <period-number>');
  console.error('Example: node generate-csv-from-existing.js 20');
  process.exit(1);
}

const { users, payPeriod } = parseHoursReport(reportPath, periodNumber);
const generator = new HoursReportGenerator(config);

console.log(`Generating CSV for period ${periodNumber}...`);
console.log(`Found ${users.length} users`);

const csvContent = generator.generatePayPeriodCSV(users, payPeriod);
const outputPath = `./kimai-data/${periodNumber}/pay-period-${periodNumber}-generated.csv`;

fs.writeFileSync(outputPath, csvContent);
console.log(`CSV saved to: ${outputPath}`);