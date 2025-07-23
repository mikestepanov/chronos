#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const { identifyPayPeriodsFromCSV } = require('./identify-pay-period');
const { importKimaiCSV } = require('./import-kimai-csv');
const { generateHoursReportFromCSV } = require('./generate-hours-report-from-csv');
require('dotenv').config();

/**
 * Get the most recent complete pay period
 * @returns {Object} Period info with start, end, and number
 */
function getMostRecentCompletePayPeriod() {
  const calculator = new PayPeriodCalculator();
  const now = new Date();
  const currentPeriodInfo = calculator.getCurrentPeriodInfo(now);
  
  if (now >= currentPeriodInfo.currentPeriod.startDate && 
      now <= currentPeriodInfo.currentPeriod.endDate) {
    const previousPeriodEnd = new Date(currentPeriodInfo.currentPeriod.startDate);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);
    const previousPeriodInfo = calculator.getCurrentPeriodInfo(previousPeriodEnd);
    
    return {
      number: previousPeriodInfo.currentPeriod.number,
      start: previousPeriodInfo.currentPeriod.startDate,
      end: previousPeriodInfo.currentPeriod.endDate
    };
  }
  
  return {
    number: currentPeriodInfo.currentPeriod.number,
    start: currentPeriodInfo.currentPeriod.startDate,
    end: currentPeriodInfo.currentPeriod.endDate
  };
}

/**
 * Display manual export instructions
 * @param {Object} period - Pay period info
 */
function displayExportInstructions(period) {
  const startStr = format(period.start, 'yyyy-MM-dd');
  const endStr = format(period.end, 'yyyy-MM-dd');
  
  // Load app config for Kimai URL
  const appConfigPath = path.join(__dirname, '../config/app.json');
  const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
  const kimaiUrl = appConfig.kimai.baseUrl;
  
  console.log('\n' + '='.repeat(70));
  console.log('MANUAL EXPORT INSTRUCTIONS');
  console.log('='.repeat(70));
  console.log(`\nPay Period #${period.number}: ${format(period.start, 'MMM dd')} - ${format(period.end, 'MMM dd, yyyy')}`);
  console.log(`\nPlease follow these steps to export the timesheet data:\n`);
  
  console.log('1. Open Kimai in your browser:');
  console.log(`   ${kimaiUrl}`);
  
  console.log('\n2. Log in with your credentials');
  
  console.log('\n3. Navigate to Timesheets:');
  console.log('   - Click "Timesheet" in the main menu');
  
  console.log('\n4. Set the date filter:');
  console.log(`   - Start date: ${startStr}`);
  console.log(`   - End date: ${endStr}`);
  console.log('   - Click "Apply" or "Search"');
  
  console.log('\n5. Export as CSV:');
  console.log('   - Click the "Export" button (usually top-right)');
  console.log('   - Select "CSV" format');
  console.log('   - Save the file to your Downloads folder');
  
  console.log('\n6. Run this command with the downloaded file:');
  console.log(`   node scripts/kimai-manual-export-helper.js ~/Downloads/[filename].csv`);
  
  console.log('\n' + '='.repeat(70));
  console.log('Waiting for CSV file path as argument...\n');
}

/**
 * Process manually exported CSV file
 * @param {string} csvPath - Path to the CSV file
 */
async function processManualExport(csvPath) {
  try {
    // Verify file exists
    if (!fs.existsSync(csvPath)) {
      throw new Error(`File not found: ${csvPath}`);
    }
    
    console.log(`\nProcessing: ${csvPath}`);
    
    // Identify pay period
    const periodInfo = identifyPayPeriodsFromCSV(csvPath);
    console.log(`\nIdentified Pay Period #${periodInfo.summary.primaryPeriod.number}`);
    
    // Import to versioned storage
    console.log('\nImporting to versioned storage...');
    const importResult = await importKimaiCSV(csvPath);
    
    // Generate hours report
    console.log('\nGenerating hours compliance report...');
    const reportResult = generateHoursReportFromCSV(importResult.files.csv);
    
    // Save report
    const reportPath = path.join(
      'kimai-data', 
      importResult.periodId, 
      'hours-report.txt'
    );
    
    const reportContent = 
      `Hours Compliance Report - Pay Period #${reportResult.period.number}\n` +
      `Period: ${format(reportResult.period.startDate, 'MMM dd')} - ${format(reportResult.period.endDate, 'MMM dd, yyyy')}\n` +
      `Generated: ${new Date().toISOString()}\n` +
      `Source: Manual export\n\n` +
      reportResult.table;
    
    fs.writeFileSync(reportPath, reportContent, 'utf8');
    
    console.log('\n' + '='.repeat(70));
    console.log('EXPORT COMPLETE');
    console.log('='.repeat(70));
    console.log('\nFiles created:');
    console.log(`- CSV: ${importResult.files.csv}`);
    console.log(`- Metadata: ${importResult.files.metadata}`);
    console.log(`- Report: ${reportPath}`);
    
    console.log('\nHours Summary:');
    console.log(reportResult.table);
    
    return {
      success: true,
      importResult,
      reportResult
    };
    
  } catch (error) {
    console.error('\nError processing export:', error.message);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const csvPath = process.argv[2];
  
  if (!csvPath) {
    // No file provided - show instructions
    const period = getMostRecentCompletePayPeriod();
    displayExportInstructions(period);
    
    console.log('Or, to process a specific pay period, provide the CSV file:');
    console.log('node scripts/kimai-manual-export-helper.js <csv-file-path>\n');
    
  } else {
    // Process the provided file
    processManualExport(csvPath)
      .then(() => {
        console.log('\nProcess completed successfully!');
        process.exit(0);
      })
      .catch(error => {
        console.error('\nProcess failed:', error.message);
        process.exit(1);
      });
  }
}

module.exports = {
  getMostRecentCompletePayPeriod,
  displayExportInstructions,
  processManualExport
};