#!/usr/bin/env node

/**
 * Pull Kimai Data - Orchestrator Script
 * 
 * This script orchestrates the process of:
 * 1. Determining the pay period to export
 * 2. Exporting data from Kimai via browser automation
 * 3. Processing and filtering the timesheet data
 * 4. Generating compliance reports
 * 5. Storing data in versioned storage
 */

const fs = require('fs');
const path = require('path');
const DateHelper = require('../shared/date-helper');
const { createLogger } = require('../shared/logger');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const StorageFactory = require('../kimai/storage/StorageFactory');
const KimaiExporter = require('../kimai/services/KimaiExporter');
const TimesheetProcessor = require('../kimai/services/TimesheetProcessor');
const HoursReportGenerator = require('../kimai/services/HoursReportGenerator');
require('dotenv').config();

// Create logger for this script
const logger = createLogger('pull-kimai');

// Load configuration
const config = loadConfiguration();

/**
 * Main orchestration function
 */
async function pullKimaiData(options = {}) {
  try {
    // Step 1: Determine pay period
    const payPeriod = options.period || getMostRecentCompletePayPeriod();
    logPayPeriodInfo(payPeriod);
    
    // Step 2: Export data from Kimai
    const exporter = new KimaiExporter(config);
    const exportResult = await exporter.exportTimesheet(payPeriod.start, payPeriod.end);
    
    if (!exportResult.success) {
      throw new Error('Failed to export data from Kimai');
    }
    
    // Step 3: Process timesheet data
    const processor = new TimesheetProcessor(config);
    const processedData = processor.processCSV(exportResult.csvData, payPeriod);
    
    logger.info('Data exported and processed', {
      totalRecords: processedData.stats.totalRecords,
      filteredRecords: processedData.stats.filteredRecords
    });
    logger.info(`Unique users: ${processedData.stats.uniqueUsers}`);
    
    // Step 4: Save to storage
    const storage = StorageFactory.create(config);
    const periodId = String(payPeriod.number); // Use pay period number as ID
    
    const storageResult = await storage.save(periodId, exportResult.csvData, {
      periodNumber: payPeriod.number,
      startDate: payPeriod.start.toISOString(),
      endDate: payPeriod.end.toISOString(),
      extractedBy: 'pull-kimai',
      exportMethod: 'playwright-automation',
      stats: processedData.stats
    });
    
    logger.info('Data saved', {
      path: `kimai-data/${periodId}/`,
      version: storageResult.version,
      isNewVersion: storageResult.isNewVersion
    });
    
    // Step 5: Generate report (if enabled)
    if (options.generateReport !== false) {
      const generator = new HoursReportGenerator(config);
      const report = generator.generateReport(processedData.timesheets, payPeriod);
      
      // Save text report
      const reportPath = await generator.saveReport(
        report.content, 
        path.join(config.storage.basePath, periodId)
      );
      
      logger.info('Hours report generated', {
        path: reportPath,
        complianceRate: report.summary.complianceRate
      });
      
      // Generate and save pay period CSV
      const payPeriodCSV = generator.generatePayPeriodCSV(report.data, payPeriod);
      const csvPath = await generator.savePayPeriodCSV(
        payPeriodCSV,
        path.join(config.storage.basePath, periodId),
        payPeriod.number
      );
      
      logger.info('Pay period CSV generated', {
        path: csvPath,
        periodNumber: payPeriod.number
      });

      // Generate and save pay period XLSX with formulas
      const payPeriodXLSX = generator.generatePayPeriodXLSX(report.data, payPeriod);
      const xlsxPath = await generator.savePayPeriodXLSX(
        payPeriodXLSX,
        path.join(config.storage.basePath, periodId),
        payPeriod.number
      );
      
      logger.info('Pay period XLSX generated', {
        path: xlsxPath,
        periodNumber: payPeriod.number
      });
      
      // Display report
      if (options.displayReport !== false) {
        console.log('\n' + report.table); // Keep console.log for formatted table output
      }
    }
    
    return {
      success: true,
      payPeriod,
      stats: processedData.stats,
      storageResult,
      reportGenerated: options.generateReport !== false
    };
    
  } catch (error) {
    logger.error('Export failed', error);
    throw error;
  }
}

/**
 * Load configuration from various sources
 */
function loadConfiguration() {
  // Load app configuration
  const appConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config/app.json'), 'utf8')
  );
  
  // Load users configuration
  const users = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config/users/users.json'), 'utf8')
  );
  
  return {
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
}

/**
 * Get the most recent complete pay period
 */
function getMostRecentCompletePayPeriod() {
  const calculator = new PayPeriodCalculator();
  const now = new Date();
  const currentPeriodInfo = calculator.getCurrentPeriodInfo(now);
  
  // If we're in the middle of a period, use the previous one
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
 * Log pay period information
 */
function logPayPeriodInfo(period) {
  logger.info('Pulling Kimai data', {
    periodNumber: period.number,
    startDate: DateHelper.formatISOInEST(period.start),
    endDate: DateHelper.formatISOInEST(period.end),
    range: DateHelper.formatPeriodRangeInEST(period.start, period.end)
  });
}

/**
 * Validate configuration
 */
function validateConfig(config) {
  if (!config.kimai.username || !config.kimai.password) {
    throw new Error('❌ KIMAI_USERNAME and KIMAI_PASSWORD must be set in .env file');
  }
}

// Export for use in other scripts
module.exports = { pullKimaiData, getMostRecentCompletePayPeriod };

// Run if called directly
if (require.main === module) {
  // Check Playwright availability first
  try {
    require('playwright');
  } catch (error) {
    logger.warn('Playwright is not installed', {
      suggestion: 'Run ./scripts/install-playwright.sh or see manual instructions'
    });
    console.error('\n⚠️  Playwright is not installed.');
    console.error('\nTo install Playwright, run:');
    console.error('  ./scripts/install-playwright.sh');
    console.error('\nOr manually:');
    console.error('  npm install');
    console.error('  npx playwright install firefox   # Recommended for Fedora');
    console.error('  npx playwright install chromium  # Alternative');
    console.error('\nFalling back to manual mode...\n');
    
    require('./pull-kimai-simple');
    return;
  }
  
  // Validate configuration
  try {
    validateConfig(config);
  } catch (error) {
    logger.error('Validation failed', error);
    console.error(error.message);
    process.exit(1);
  }
  
  // Run the pull
  pullKimaiData()
    .then(() => {
      logger.info('Pull completed successfully');
      console.log('\n✨ Pull completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Pull failed', error);
      console.error('\n💥 Pull failed:', error.message);
      process.exit(1);
    });
}