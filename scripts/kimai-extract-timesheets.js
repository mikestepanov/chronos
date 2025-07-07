#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { format, addDays, startOfDay, endOfDay } = require('date-fns');
const KimaiClient = require('../shared/kimai-client');
require('dotenv').config();

// Configuration
const config = {
  kimai: {
    baseUrl: process.env.KIMAI_URL || 'https://kimai.starthub.academy',
    apiKey: process.env.KIMAI_API_KEY,
    username: process.env.KIMAI_USERNAME,
    password: process.env.KIMAI_PASSWORD
  },
  outputDir: process.env.TIMESHEET_OUTPUT_DIR || './timesheets',
  payPeriodDays: parseInt(process.env.PAY_PERIOD_DAYS || '14'),
  extractAfterDays: parseInt(process.env.EXTRACT_AFTER_DAYS || '7') // Extract after 7 days into pay period
};

// Calculate current pay period
function getCurrentPayPeriod() {
  const now = new Date();
  const payPeriodStart = new Date(process.env.PAY_PERIOD_START || '2024-01-01');
  
  // Calculate days since first pay period
  const daysSinceStart = Math.floor((now - payPeriodStart) / (1000 * 60 * 60 * 24));
  const currentPeriod = Math.floor(daysSinceStart / config.payPeriodDays);
  
  // Calculate current period dates
  const periodStart = addDays(payPeriodStart, currentPeriod * config.payPeriodDays);
  const periodEnd = addDays(periodStart, config.payPeriodDays - 1);
  
  return {
    start: startOfDay(periodStart),
    end: endOfDay(periodEnd),
    daysElapsed: daysSinceStart % config.payPeriodDays + 1,
    periodNumber: currentPeriod + 1
  };
}

// Extract timesheets for a date range
async function extractTimesheets(startDate, endDate, outputPath) {
  const client = new KimaiClient(config.kimai);
  
  try {
    console.log(`Extracting timesheets from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}...`);
    
    // Get CSV data
    const csvData = await client.exportCSV(startDate, endDate);
    
    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write CSV file
    fs.writeFileSync(outputPath, csvData);
    console.log(`✓ Timesheets saved to: ${outputPath}`);
    
    // Also get JSON data for additional processing
    const timesheets = await client.getTimesheets(startDate, endDate);
    const jsonPath = outputPath.replace('.csv', '.json');
    fs.writeFileSync(jsonPath, JSON.stringify(timesheets, null, 2));
    console.log(`✓ JSON data saved to: ${jsonPath}`);
    
    // Generate summary
    const summary = generateSummary(timesheets);
    const summaryPath = outputPath.replace('.csv', '_summary.txt');
    fs.writeFileSync(summaryPath, summary);
    console.log(`✓ Summary saved to: ${summaryPath}`);
    
    return { success: true, files: [outputPath, jsonPath, summaryPath] };
  } catch (error) {
    console.error('Error extracting timesheets:', error.message);
    return { success: false, error: error.message };
  }
}

// Generate summary of timesheet data
function generateSummary(timesheets) {
  const userHours = {};
  const projectHours = {};
  let totalHours = 0;
  
  timesheets.forEach(entry => {
    const hours = entry.duration / 3600; // Convert seconds to hours
    const userName = entry.user?.alias || 'Unknown';
    const projectName = entry.project?.name || 'Unknown';
    
    userHours[userName] = (userHours[userName] || 0) + hours;
    projectHours[projectName] = (projectHours[projectName] || 0) + hours;
    totalHours += hours;
  });
  
  let summary = `Timesheet Summary\n${'='.repeat(50)}\n\n`;
  summary += `Total Entries: ${timesheets.length}\n`;
  summary += `Total Hours: ${totalHours.toFixed(2)}\n\n`;
  
  summary += `Hours by User:\n${'-'.repeat(30)}\n`;
  Object.entries(userHours)
    .sort(([,a], [,b]) => b - a)
    .forEach(([user, hours]) => {
      summary += `${user.padEnd(25)} ${hours.toFixed(2)} hours\n`;
    });
  
  summary += `\nHours by Project:\n${'-'.repeat(30)}\n`;
  Object.entries(projectHours)
    .sort(([,a], [,b]) => b - a)
    .forEach(([project, hours]) => {
      summary += `${project.padEnd(25)} ${hours.toFixed(2)} hours\n`;
    });
  
  return summary;
}

// Main execution
async function main() {
  const period = getCurrentPayPeriod();
  
  console.log(`\nKimai Timesheet Extractor`);
  console.log(`${'='.repeat(50)}`);
  console.log(`Current Pay Period: #${period.periodNumber}`);
  console.log(`Period Dates: ${format(period.start, 'MMM dd')} - ${format(period.end, 'MMM dd, yyyy')}`);
  console.log(`Days Elapsed: ${period.daysElapsed} of ${config.payPeriodDays}`);
  
  // Check if it's time to extract
  if (period.daysElapsed < config.extractAfterDays) {
    console.log(`\n⏳ Not yet time to extract. Will extract after day ${config.extractAfterDays}.`);
    process.exit(0);
  }
  
  // Generate output filename
  const outputFilename = `timesheets_period${period.periodNumber}_${format(period.start, 'yyyyMMdd')}-${format(period.end, 'yyyyMMdd')}.csv`;
  const outputPath = path.join(config.outputDir, outputFilename);
  
  // Extract timesheets
  const result = await extractTimesheets(period.start, period.end, outputPath);
  
  if (result.success) {
    console.log(`\n✅ Extraction complete!`);
    console.log(`Files created:`);
    result.files.forEach(file => console.log(`  - ${file}`));
  } else {
    console.error(`\n❌ Extraction failed: ${result.error}`);
    process.exit(1);
  }
}

// Command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Kimai Timesheet Extractor

Usage: node kimai-extract-timesheets.js [options]

Options:
  --force              Extract regardless of days elapsed
  --start YYYY-MM-DD   Custom start date
  --end YYYY-MM-DD     Custom end date
  --output PATH        Custom output path
  --help, -h           Show this help

Environment Variables:
  KIMAI_URL            Kimai server URL
  KIMAI_API_KEY        API key for authentication
  KIMAI_USERNAME       Username (if API key not available)
  KIMAI_PASSWORD       Password (if API key not available)
  TIMESHEET_OUTPUT_DIR Output directory (default: ./timesheets)
  PAY_PERIOD_DAYS      Days per pay period (default: 14)
  PAY_PERIOD_START     First pay period start date
  EXTRACT_AFTER_DAYS   Days to wait before extraction (default: 7)
`);
  process.exit(0);
}

// Handle custom date range
if (process.argv.includes('--start') || process.argv.includes('--end')) {
  const startIdx = process.argv.indexOf('--start');
  const endIdx = process.argv.indexOf('--end');
  const outputIdx = process.argv.indexOf('--output');
  
  const startDate = startIdx > -1 ? new Date(process.argv[startIdx + 1]) : getCurrentPayPeriod().start;
  const endDate = endIdx > -1 ? new Date(process.argv[endIdx + 1]) : getCurrentPayPeriod().end;
  const outputPath = outputIdx > -1 ? process.argv[outputIdx + 1] : 
    path.join(config.outputDir, `timesheets_custom_${format(startDate, 'yyyyMMdd')}-${format(endDate, 'yyyyMMdd')}.csv`);
  
  extractTimesheets(startDate, endDate, outputPath).then(result => {
    process.exit(result.success ? 0 : 1);
  });
} else if (process.argv.includes('--force')) {
  // Force extraction regardless of days elapsed
  const period = getCurrentPayPeriod();
  const outputFilename = `timesheets_period${period.periodNumber}_${format(period.start, 'yyyyMMdd')}-${format(period.end, 'yyyyMMdd')}.csv`;
  const outputPath = path.join(config.outputDir, outputFilename);
  
  extractTimesheets(period.start, period.end, outputPath).then(result => {
    process.exit(result.success ? 0 : 1);
  });
} else {
  // Normal execution
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}