#!/usr/bin/env node

const PayPeriodCalculator = require('../shared/pay-period-calculator');
const DateHelper = require('../shared/date-helper');
const KimaiExporter = require('../kimai/services/KimaiExporter');
const TimesheetProcessor = require('../kimai/services/TimesheetProcessor');
const HoursReportGenerator = require('../kimai/services/HoursReportGenerator');
const StorageFactory = require('../kimai/storage/StorageFactory');
const { createLogger } = require('../shared/logger');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const logger = createLogger('extract-periods');

// Load configuration
const appConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/app.json'), 'utf8')
);

const users = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/users/users.json'), 'utf8')
);

const config = {
  kimai: {
    baseUrl: appConfig.kimai.baseUrl,
    username: process.env.KIMAI_USERNAME,
    password: process.env.KIMAI_PASSWORD
  },
  storage: {
    type: process.env.STORAGE_TYPE || 'file',
    basePath: process.env.STORAGE_PATH || './kimai-data',
    git: {
      autoCommit: process.env.GIT_AUTO_COMMIT !== 'false',
      autoPush: process.env.GIT_AUTO_PUSH === 'true'
    }
  },
  browser: {
    type: process.env.PLAYWRIGHT_BROWSER || 'firefox',
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    timeout: 30000
  },
  users
};

// Extend PayPeriodCalculator to get specific period by number
function getSpecificPayPeriod(periodNumber) {
  const calculator = new PayPeriodCalculator();
  const basePeriod = calculator.basePeriodNumber;
  const basePeriodEnd = calculator.basePeriodEndDate;
  const periodLengthDays = calculator.periodLengthDays;
  
  // Calculate how many periods forward/backward from base
  const periodsDifference = periodNumber - basePeriod;
  
  // Calculate the dates for the requested period
  const periodEnd = DateHelper.addDays(basePeriodEnd, periodsDifference * periodLengthDays);
  const periodStart = DateHelper.addDays(periodEnd, -(periodLengthDays - 1));
  
  return {
    id: `${periodEnd.getFullYear()}-${periodNumber}`,
    number: periodNumber,
    start: periodStart,
    end: periodEnd
  };
}

async function extractPeriod(periodNumber) {
  console.log(`\n📊 Extracting Pay Period ${periodNumber}...`);
  
  try {
    // Get the pay period dates
    const payPeriod = getSpecificPayPeriod(periodNumber);
    
    console.log(`   Period ${periodNumber}: ${DateHelper.format(payPeriod.start, 'MMM d')} - ${DateHelper.format(payPeriod.end, 'MMM d, yyyy')}`);
    
    // Export data from Kimai
    const exporter = new KimaiExporter(config);
    const exportResult = await exporter.exportTimesheet(payPeriod.start, payPeriod.end);
    
    if (!exportResult.success) {
      throw new Error(`Failed to export data for period ${periodNumber}`);
    }
    
    // Process timesheet data
    const processor = new TimesheetProcessor(config);
    const processedData = processor.processCSV(exportResult.csvData, payPeriod);
    
    // Store data
    const storage = StorageFactory.create(config);
    const periodId = String(payPeriod.number);
    const saveResult = await storage.save(periodId, exportResult.csvData, {
      periodNumber: payPeriod.number,
      startDate: payPeriod.start.toISOString(),
      endDate: payPeriod.end.toISOString(),
      extractedBy: 'extract-periods',
      exportMethod: 'playwright-automation',
      stats: processedData.stats
    });
    
    // Generate hours report
    const reportGenerator = new HoursReportGenerator(config);
    const hoursReport = reportGenerator.generateReport(processedData.timesheets, payPeriod);
    
    // Save the reports
    const dataDir = `kimai-data/${periodId}`;
    await reportGenerator.saveReport(hoursReport.content, dataDir);
    
    // Generate and save CSV/XLSX
    const csvContent = reportGenerator.generatePayPeriodCSV(hoursReport.data, payPeriod);
    await reportGenerator.savePayPeriodCSV(csvContent, dataDir, periodNumber);
    
    const xlsxBuffer = reportGenerator.generatePayPeriodXLSX(hoursReport.data, payPeriod);
    await reportGenerator.savePayPeriodXLSX(xlsxBuffer, dataDir, periodNumber);
    
    console.log(`   ✅ Period ${periodNumber} extracted successfully`);
    console.log(`   📁 Data saved to: ${dataDir}`);
    
    return {
      periodNumber,
      report: hoursReport.table,
      dataDir,
      processedData
    };
    
  } catch (error) {
    console.error(`   ❌ Failed to extract period ${periodNumber}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting extraction of pay period 26...\n');

  const periodNumber = process.argv[2] || 26;
  
  // Extract period
  const periodResult = await extractPeriod(periodNumber);
  
  // Display results
  console.log('\n' + '='.repeat(80));
  console.log('📊 EXTRACTION RESULTS');
  console.log('='.repeat(80));
  
  if (periodResult) {
    console.log(`\n📅 Pay Period ${periodNumber}:`);
    console.log(periodResult.report);
  }
  
  console.log('\n✨ Extraction complete!');
}

// Run the extraction
main().catch(error => {
  logger.error('Extraction failed', error);
  console.error('\n💥 Extraction failed:', error.message);
  process.exit(1);
});