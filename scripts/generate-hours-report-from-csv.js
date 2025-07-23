#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { format } = require('date-fns');
const { identifyPayPeriodsFromCSV } = require('./identify-pay-period');
const { generateHoursReport, formatReportAsTable } = require('./kimai-hours-report');

// Configuration
const config = {
  usersConfigPath: path.join(__dirname, '../config/users/users.json')
};

/**
 * Generate hours report from a CSV file
 * @param {string} csvPath - Path to the CSV file
 * @returns {Object} Report results
 */
function generateHoursReportFromCSV(csvPath) {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }
  
  // Load user configuration
  const users = JSON.parse(fs.readFileSync(config.usersConfigPath, 'utf8'));
  
  // Parse CSV
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });
  
  // Identify pay period
  const periodInfo = identifyPayPeriodsFromCSV(csvPath);
  const targetPeriod = periodInfo.summary.primaryPeriod;
  
  // Convert CSV records to timesheet format
  const timesheets = records
    .filter(record => record.Date && /^\d{4}-\d{2}-\d{2}$/.test(record.Date))
    .map(record => {
      // Parse duration (format: "H:MM" or "HH:MM")
      const durationParts = (record.Duration || '0:00').split(':');
      const hours = parseInt(durationParts[0] || 0);
      const minutes = parseInt(durationParts[1] || 0);
      const durationSeconds = (hours * 3600) + (minutes * 60);
      
      // Map username to user ID
      let userId = null;
      const username = record.User?.toLowerCase();
      
      // Find user by username
      const user = users.users.find(u => 
        u.services?.kimai?.username?.toLowerCase() === username
      );
      
      if (user && user.services?.kimai?.id) {
        userId = user.services.kimai.id;
      }
      
      return {
        user: userId || username, // Use username if no ID mapping found
        duration: durationSeconds,
        date: record.Date,
        project: record.Project,
        activity: record.Activity,
        description: record.Description
      };
    });
  
  // Generate report
  const report = generateHoursReport(timesheets, users);
  const table = formatReportAsTable(report);
  
  return {
    period: targetPeriod,
    report,
    table,
    totalEntries: timesheets.length
  };
}

// Run if called directly
if (require.main === module) {
  const csvPath = process.argv[2];
  
  if (!csvPath) {
    console.error('Error: Please provide a CSV file path');
    console.error('Usage: node generate-hours-report-from-csv.js <csv-file-path>');
    process.exit(1);
  }
  
  try {
    const result = generateHoursReportFromCSV(csvPath);
    
    console.log(`\nHours Report for Pay Period #${result.period.number}`);
    console.log(`Period: ${format(result.period.startDate, 'MMM dd')} - ${format(result.period.endDate, 'MMM dd, yyyy')}`);
    console.log(`Total Entries: ${result.totalEntries}\n`);
    console.log(result.table);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = { generateHoursReportFromCSV };