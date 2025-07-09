#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const KimaiAPI = require('../kimai/services/KimaiAPI');
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
  usersConfigPath: path.join(__dirname, '../config/users/users.json')
};

/**
 * Get the most recent complete pay period
 * @returns {Object} Period info with start, end, and number
 */
function getMostRecentCompletePayPeriod() {
  const calculator = new PayPeriodCalculator();
  const now = new Date();
  const currentPeriodInfo = calculator.getCurrentPeriodInfo(now);
  
  // If we're in the current period, calculate the previous one
  if (now >= currentPeriodInfo.currentPeriod.startDate && 
      now <= currentPeriodInfo.currentPeriod.endDate) {
    // Calculate previous period by going back 14 days from current period start
    const previousPeriodEnd = new Date(currentPeriodInfo.currentPeriod.startDate);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
    const previousPeriodInfo = calculator.getCurrentPeriodInfo(previousPeriodEnd);
    
    return {
      number: previousPeriodInfo.currentPeriod.number,
      start: previousPeriodInfo.currentPeriod.startDate,
      end: previousPeriodInfo.currentPeriod.endDate
    };
  }
  
  // Otherwise current period is complete
  return {
    number: currentPeriodInfo.currentPeriod.number,
    start: currentPeriodInfo.currentPeriod.startDate,
    end: currentPeriodInfo.currentPeriod.endDate
  };
}

/**
 * Extract timesheets for a given period and save to files
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @param {Number} periodNumber
 * @returns {Promise<Object>} Timesheet data and file paths
 */
async function extractTimesheetsAndSave(startDate, endDate, periodNumber) {
  const client = new KimaiAPI(config.kimai);
  
  try {
    // Create output filename
    const dateRange = `${format(startDate, 'yyyyMMdd')}-${format(endDate, 'yyyyMMdd')}`;
    const baseFilename = `timesheets_period${periodNumber}_${dateRange}`;
    
    // Ensure output directory exists
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // Get timesheets data
    const timesheets = await client.getTimesheets(startDate, endDate);
    
    // Save JSON
    const jsonPath = path.join(config.outputDir, `${baseFilename}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(timesheets, null, 2));
    
    // Get and save CSV
    const csvData = await client.exportCSV(startDate, endDate);
    const csvPath = path.join(config.outputDir, `${baseFilename}.csv`);
    fs.writeFileSync(csvPath, csvData);
    
    // Generate and save summary
    const summary = generateSummary(timesheets);
    const summaryPath = path.join(config.outputDir, `${baseFilename}_summary.txt`);
    fs.writeFileSync(summaryPath, summary);
    
    console.log(`✓ Files saved:`);
    console.log(`  - ${csvPath}`);
    console.log(`  - ${jsonPath}`);
    console.log(`  - ${summaryPath}`);
    
    return {
      timesheets,
      files: {
        csv: csvPath,
        json: jsonPath,
        summary: summaryPath
      }
    };
  } catch (error) {
    console.error('Failed to extract timesheets:', error.message);
    throw error;
  }
}

/**
 * Generate summary text
 * @param {Array} timesheets 
 * @returns {String} Summary text
 */
function generateSummary(timesheets) {
  const userHours = {};
  const projectHours = {};
  let totalHours = 0;
  
  timesheets.forEach(entry => {
    const hours = entry.duration / 3600;
    const userId = entry.user;
    const projectName = entry.project?.name || 'Unknown';
    
    userHours[userId] = (userHours[userId] || 0) + hours;
    projectHours[projectName] = (projectHours[projectName] || 0) + hours;
    totalHours += hours;
  });
  
  let summary = `Timesheet Summary\n${'='.repeat(50)}\n\n`;
  summary += `Total Entries: ${timesheets.length}\n`;
  summary += `Total Hours: ${totalHours.toFixed(2)}\n\n`;
  
  summary += `Hours by User ID:\n${'-'.repeat(30)}\n`;
  Object.entries(userHours)
    .sort((a, b) => b[1] - a[1])
    .forEach(([userId, hours]) => {
      summary += `User ${userId.toString().padEnd(10)} ${hours.toFixed(2).padStart(10)} hours\n`;
    });
  
  summary += `\nHours by Project:\n${'-'.repeat(30)}\n`;
  Object.entries(projectHours)
    .sort((a, b) => b[1] - a[1])
    .forEach(([project, hours]) => {
      summary += `${project.padEnd(20)} ${hours.toFixed(2).padStart(10)} hours\n`;
    });
  
  return summary;
}

/**
 * Generate hours comparison report
 * @param {Array} timesheets - Timesheet entries
 * @param {Object} users - User configuration
 * @returns {Object} Report with table and stats
 */
function generateHoursReport(timesheets, users) {
  // Create mapping of Kimai ID to user info
  const userMap = {};
  users.users.forEach(user => {
    if (user.active && user.services.kimai) {
      userMap[user.services.kimai.id] = {
        name: user.name,
        expectedHours: user.expectedHours || 0
      };
    }
  });
  
  // Calculate hours per user
  const userHours = {};
  timesheets.forEach(entry => {
    const kimaiId = entry.user;
    if (!userHours[kimaiId]) {
      userHours[kimaiId] = 0;
    }
    userHours[kimaiId] += entry.duration / 3600; // Convert seconds to hours
  });
  
  // Build report data
  const reportData = [];
  let totalWorked = 0;
  let totalExpected = 0;
  
  // Add users with timesheet entries
  Object.entries(userHours).forEach(([kimaiId, hours]) => {
    const userInfo = userMap[parseInt(kimaiId)] || { name: `User ${kimaiId}`, expectedHours: 80 };
    const expected = userInfo.expectedHours;
    const diff = hours - expected;
    const percent = expected > 0 ? (hours / expected * 100) : 0;
    const status = hours >= (expected - 3) ? '✅' : '❌'; // 3-hour grace period
    
    totalWorked += hours;
    totalExpected += expected;
    
    reportData.push({
      name: userInfo.name,
      hoursWorked: hours,
      expectedHours: expected,
      difference: diff,
      percentOfExpected: percent,
      status: status
    });
  });
  
  // Add users with no entries but expected hours > 0
  Object.entries(userMap).forEach(([kimaiId, userInfo]) => {
    if (userInfo.expectedHours > 0 && !userHours[kimaiId]) {
      totalExpected += userInfo.expectedHours;
      
      reportData.push({
        name: userInfo.name,
        hoursWorked: 0,
        expectedHours: userInfo.expectedHours,
        difference: -userInfo.expectedHours,
        percentOfExpected: 0,
        status: '❌'
      });
    }
  });
  
  // Sort by hours worked (descending)
  reportData.sort((a, b) => b.hoursWorked - a.hoursWorked);
  
  return {
    entries: reportData,
    totalWorked: totalWorked,
    totalExpected: totalExpected,
    overallPercent: totalExpected > 0 ? (totalWorked / totalExpected * 100) : 0
  };
}

/**
 * Format report as table
 * @param {Object} report - Report data from generateHoursReport
 * @returns {String} Formatted table
 */
function formatReportAsTable(report) {
  let table = '| User | Hours Worked | Expected | Difference | % of Expected | Status |\n';
  table += '|------|--------------|----------|------------|---------------|--------|\n';
  
  report.entries.forEach(entry => {
    const diffStr = entry.difference >= 0 ? `+${entry.difference.toFixed(2)}` : entry.difference.toFixed(2);
    table += `| ${entry.name.padEnd(20)} | ${entry.hoursWorked.toFixed(2).padStart(12)} | ${entry.expectedHours.toFixed(2).padStart(8)} | ${diffStr.padStart(10)} | ${entry.percentOfExpected.toFixed(1).padStart(13)}% | ${entry.status} |\n`;
  });
  
  table += '|------|--------------|----------|------------|---------------|--------|\n';
  const totalDiff = report.totalWorked - report.totalExpected;
  const totalDiffStr = totalDiff >= 0 ? `+${totalDiff.toFixed(2)}` : totalDiff.toFixed(2);
  table += `| **TOTAL**            | **${report.totalWorked.toFixed(2).padStart(10)}** | **${report.totalExpected.toFixed(2).padStart(6)}** | **${totalDiffStr.padStart(8)}** | **${report.overallPercent.toFixed(1).padStart(11)}%** |    |\n`;
  
  return table;
}

/**
 * Main function to get hours report for most recent complete pay period
 * @returns {Promise<Object>} Report object with period info and formatted table
 */
async function getMostRecentPayPeriodHoursReport() {
  try {
    // Get most recent complete pay period
    const period = getMostRecentCompletePayPeriod();
    console.log(`\nGenerating report for Pay Period #${period.number}`);
    console.log(`Period: ${format(period.start, 'MMM dd')} - ${format(period.end, 'MMM dd, yyyy')}\n`);
    
    // Extract timesheets and save files
    const extractResult = await extractTimesheetsAndSave(period.start, period.end, period.number);
    const timesheets = extractResult.timesheets;
    
    // Load user configuration
    const users = JSON.parse(fs.readFileSync(config.usersConfigPath, 'utf8'));
    
    // Generate report
    const report = generateHoursReport(timesheets, users);
    const table = formatReportAsTable(report);
    
    return {
      period: period,
      report: report,
      table: table,
      files: extractResult.files
    };
  } catch (error) {
    console.error('Error generating report:', error.message);
    throw error;
  }
}

// Export functions for use in other scripts
module.exports = {
  getMostRecentCompletePayPeriod,
  extractTimesheetsAndSave,
  generateHoursReport,
  formatReportAsTable,
  getMostRecentPayPeriodHoursReport
};

// Run if called directly
if (require.main === module) {
  getMostRecentPayPeriodHoursReport()
    .then(result => {
      console.log(result.table);
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to generate report:', error);
      process.exit(1);
    });
}