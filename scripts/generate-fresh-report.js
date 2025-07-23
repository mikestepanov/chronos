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

// User expectations mapping
const userExpectations = {
  'pauline': { expected: 80, name: 'Pauline Nguyen' },
  'Raheel Shahzad': { expected: 80, name: 'Raheel Shahzad' },
  'Mori Isaac': { expected: 80, name: 'Mori Isaac' },
  'Dharam Pal Singh': { expected: 80, name: 'Dharam Pal Singh' },
  'ariful': { expected: 80, name: 'Ariful' },
  'Yulia': { expected: 50, name: 'Yulia' },
  'eddy': { expected: 40, name: 'Eddy' }
};

// Load the 10 CSV file
const records = parseCSV('20250710-kimai-export.csv');

// Calculate hours by user
const userHours = {};
records.forEach(record => {
  const user = record.User || record.Name;
  const hours = parseDuration(record.Duration);
  
  if (!userHours[user]) {
    userHours[user] = 0;
  }
  userHours[user] += hours;
});

// Generate report
const reportData = [];
let totalWorked = 0;
let totalExpected = 0;

Object.entries(userHours).forEach(([user, hours]) => {
  const expectation = userExpectations[user] || userExpectations[user.replace('raheel', 'Raheel Shahzad')] || { expected: 80, name: user };
  const difference = hours - expectation.expected;
  const percentage = (difference / expectation.expected) * 100;
  const status = Math.abs(difference) <= 3 ? '✓' : '✗';
  
  totalWorked += hours;
  totalExpected += expectation.expected;
  
  reportData.push({
    name: expectation.name,
    worked: hours,
    expected: expectation.expected,
    difference: difference,
    percentage: percentage,
    status: status
  });
});

// Sort by hours worked (descending)
reportData.sort((a, b) => b.worked - a.worked);

// Generate report text
const reportLines = [];
reportLines.push(`Hours Compliance Report - Pay Period #19 (Jun 24 - Jul 07, 2025)`);
reportLines.push(`Generated from CSV: 20250710-kimai-export.csv`);
reportLines.push(`Generated at: ${new Date().toISOString()}`);
reportLines.push(``);
reportLines.push(`| User | Hours Worked | Expected | Difference | % Deviation | Status |`);
reportLines.push(`|------|--------------|----------|------------|-------------|--------|`);

reportData.forEach(user => {
  const diffStr = user.difference >= 0 ? `+${user.difference.toFixed(2)}` : user.difference.toFixed(2);
  const pctStr = user.percentage >= 0 ? `+${user.percentage.toFixed(1)}%` : `${user.percentage.toFixed(1)}%`;
  
  reportLines.push(
    `| ${user.name.padEnd(20)} | ${user.worked.toFixed(2).padStart(12)} | ${user.expected.toFixed(2).padStart(8)} | ${diffStr.padStart(11)} | ${pctStr.padStart(11)} | ${user.status.padStart(6)} |`
  );
});

const totalDiff = totalWorked - totalExpected;
const totalPct = (totalDiff / totalExpected) * 100;
reportLines.push(`|------|--------------|----------|------------|-------------|--------|`);
reportLines.push(
  `| ${'**TOTAL**'.padEnd(20)} | **${totalWorked.toFixed(2).padStart(10)}** | **${totalExpected.toFixed(2).padStart(6)}** | **${(totalDiff >= 0 ? '+' : '') + totalDiff.toFixed(2).padStart(9)}** | **${(totalPct >= 0 ? '+' : '') + totalPct.toFixed(1).padStart(9)}%** |    |`
);

reportLines.push(``);
reportLines.push(`Compliance Threshold: ±3 hours from expected`);
reportLines.push(`✓ = Within compliance (difference ≤ 3 hours)`);
reportLines.push(`✗ = Out of compliance (difference > 3 hours)`);

const report = reportLines.join('\n');

// Save to file
const reportPath = 'kimai-data/2025-06-24/hours-report.txt';
fs.mkdirSync('kimai-data/2025-06-24', { recursive: true });
fs.writeFileSync(reportPath, report);

// Also save the CSV
fs.copyFileSync('20250710-kimai-export.csv', 'kimai-data/2025-06-24/v1.csv');

// Create metadata
const metadata = {
  payPeriod: {
    number: 19,
    start: '2025-06-24',
    end: '2025-07-07'
  },
  extraction: {
    timestamp: new Date().toISOString(),
    source: '20250710-kimai-export.csv',
    recordCount: records.length
  },
  files: {
    csv: 'v1.csv',
    report: 'hours-report.txt'
  }
};

fs.writeFileSync('kimai-data/2025-06-24/metadata.json', JSON.stringify(metadata, null, 2));

// Display report
console.log(report);
console.log('\n\nFiles saved to kimai-data/2025-06-24/');
console.log('- hours-report.txt');
console.log('- v1.csv');
console.log('- metadata.json');