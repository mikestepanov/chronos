#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const KimaiAPI = require('../kimai/services/KimaiAPI');
const StorageFactory = require('../kimai/storage/StorageFactory');
require('dotenv').config();

// Configuration
const config = {
  kimai: {
    baseUrl: process.env.KIMAI_URL || 'https://kimai.starthub.academy',
    apiKey: process.env.KIMAI_API_KEY,
    username: process.env.KIMAI_USERNAME,
    password: process.env.KIMAI_PASSWORD
  },
  usersConfigPath: path.join(__dirname, '../config/users/users.json'),
  storage: {
    type: process.env.STORAGE_TYPE || 'file',
    basePath: process.env.STORAGE_PATH || './kimai-data',
    git: {
      autoCommit: process.env.GIT_AUTO_COMMIT !== 'false',
      autoPush: process.env.GIT_AUTO_PUSH === 'true'
    }
  }
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
 * Extract timesheets for a given period and save using versioned storage
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @param {Number} periodNumber
 * @returns {Promise<Object>} Timesheet data and storage info
 */
async function extractTimesheetsAndSave(startDate, endDate, periodNumber) {
  const client = new KimaiAPI(config.kimai);
  const storage = StorageFactory.create(config);
  
  try {
    // Get timesheets data
    const timesheets = await client.getTimesheets(startDate, endDate);
    
    // Get CSV data
    const csvData = await client.exportCSV(startDate, endDate);
    
    // Period ID is the start date in YYYY-MM-DD format
    const periodId = format(startDate, 'yyyy-MM-dd');
    
    // Save using versioned storage
    const storageResult = await storage.save(periodId, csvData, {
      periodNumber,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      extractedBy: 'kimai-hours-report'
    });
    
    console.log(`✓ Data saved to kimai-data/${periodId}/`);
    console.log(`  - Version: ${storageResult.version}`);
    console.log(`  - Records: ${storageResult.recordCount}`);
    console.log(`  - New version: ${storageResult.isNewVersion ? 'Yes' : 'No (unchanged)'}`);
    
    return {
      timesheets,
      storageResult,
      periodId,
      files: {
        csv: `kimai-data/${periodId}/v${storageResult.version}.csv`,
        metadata: `kimai-data/${periodId}/metadata.json`
      }
    };
  } catch (error) {
    console.error('Failed to extract timesheets:', error.message);
    throw error;
  }
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
    const percentDeviation = expected > 0 ? ((diff / expected) * 100) : (hours > 0 ? 100 : 0);
    // Status: ✅ only if within ±3 hours (not just -3)
    const status = (hours >= (expected - 3) && hours <= (expected + 3)) ? '✅' : '❌';
    
    totalWorked += hours;
    totalExpected += expected;
    
    reportData.push({
      name: userInfo.name,
      hoursWorked: hours,
      expectedHours: expected,
      difference: diff,
      percentDeviation: percentDeviation,
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
        percentDeviation: -100,
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
    overallPercent: totalExpected > 0 ? (totalWorked / totalExpected * 100) : 0,
    overallDeviation: totalExpected > 0 ? (((totalWorked - totalExpected) / totalExpected) * 100) : 0
  };
}

/**
 * Format report as table
 * @param {Object} report - Report data from generateHoursReport
 * @returns {String} Formatted table
 */
function formatReportAsTable(report) {
  let table = '| User | Hours Worked | Expected | Difference | % Deviation | Status |\n';
  table += '|------|--------------|----------|------------|-------------|--------|\n';
  
  report.entries.forEach(entry => {
    const diffStr = entry.difference >= 0 ? `+${entry.difference.toFixed(2)}` : entry.difference.toFixed(2);
    const deviationStr = entry.percentDeviation >= 0 ? `+${entry.percentDeviation.toFixed(1)}%` : `${entry.percentDeviation.toFixed(1)}%`;
    table += `| ${entry.name.padEnd(20)} | ${entry.hoursWorked.toFixed(2).padStart(12)} | ${entry.expectedHours.toFixed(2).padStart(8)} | ${diffStr.padStart(10)} | ${deviationStr.padStart(11)} | ${entry.status} |\n`;
  });
  
  table += '|------|--------------|----------|------------|-------------|--------|\n';
  const totalDiff = report.totalWorked - report.totalExpected;
  const totalDiffStr = totalDiff >= 0 ? `+${totalDiff.toFixed(2)}` : totalDiff.toFixed(2);
  const totalDeviationStr = report.overallDeviation >= 0 ? `+${report.overallDeviation.toFixed(1)}%` : `${report.overallDeviation.toFixed(1)}%`;
  table += `| **TOTAL**            | **${report.totalWorked.toFixed(2).padStart(10)}** | **${report.totalExpected.toFixed(2).padStart(6)}** | **${totalDiffStr.padStart(8)}** | **${totalDeviationStr.padStart(9)}** |    |\n`;
  
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