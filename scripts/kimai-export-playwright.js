#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const StorageFactory = require('../kimai/storage/StorageFactory');
require('dotenv').config();

// Configuration
const config = {
  kimai: {
    baseUrl: process.env.KIMAI_URL || 'https://kimai.starthub.academy',
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
  downloads: {
    path: path.join(__dirname, '../temp-downloads')
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
 * Export timesheets using Playwright browser automation
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @param {Number} periodNumber
 * @returns {Promise<Object>} Export results
 */
async function exportTimesheetsWithPlaywright(startDate, endDate, periodNumber) {
  // Ensure downloads directory exists
  if (!fs.existsSync(config.downloads.path)) {
    fs.mkdirSync(config.downloads.path, { recursive: true });
  }
  
  // Clean up old downloads
  const files = fs.readdirSync(config.downloads.path);
  files.forEach(file => {
    if (file.endsWith('.csv')) {
      fs.unlinkSync(path.join(config.downloads.path, file));
    }
  });
  
  const browser = await chromium.launch({ 
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false' 
  });
  
  try {
    const context = await browser.newContext({
      acceptDownloads: true
    });
    
    const page = await context.newPage();
    
    console.log('Navigating to Kimai...');
    await page.goto(config.kimai.baseUrl);
    
    // Login
    console.log('Logging in...');
    await page.fill('input[name="username"]', config.kimai.username);
    await page.fill('input[name="password"]', config.kimai.password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('.main-header', { timeout: 10000 });
    console.log('Login successful');
    
    // Navigate to timesheets
    console.log('Navigating to timesheets...');
    await page.click('a[href*="/timesheet"]');
    await page.waitForSelector('.page-header', { timeout: 10000 });
    
    // Set date filters
    console.log(`Setting date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
    
    // Click on date filter button (might be in a dropdown or filter panel)
    const filterButton = await page.locator('button:has-text("Filter"), a:has-text("Filter")').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(500);
    }
    
    // Set start date
    const startDateInput = await page.locator('input[name*="begin"], input[name*="start"], input[id*="begin"], input[id*="start"]').first();
    await startDateInput.clear();
    await startDateInput.fill(format(startDate, 'yyyy-MM-dd'));
    
    // Set end date
    const endDateInput = await page.locator('input[name*="end"], input[id*="end"]').first();
    await endDateInput.clear();
    await endDateInput.fill(format(endDate, 'yyyy-MM-dd'));
    
    // Apply filter
    const applyButton = await page.locator('button:has-text("Apply"), button:has-text("Search"), button[type="submit"]').first();
    await applyButton.click();
    
    // Wait for results to load
    await page.waitForTimeout(2000);
    
    // Find and click export button
    console.log('Starting CSV export...');
    
    // Look for export/download button
    const exportButton = await page.locator('a[href*="export"], button:has-text("Export"), button:has-text("Download"), .dropdown-toggle:has-text("Export")').first();
    await exportButton.click();
    
    // If it's a dropdown, click CSV option
    const csvOption = await page.locator('a:has-text("CSV"), a[href*=".csv"], a[href*="type=csv"]').first();
    if (await csvOption.isVisible()) {
      // Start waiting for download before clicking
      const downloadPromise = page.waitForEvent('download');
      await csvOption.click();
      
      console.log('Waiting for download...');
      const download = await downloadPromise;
      
      // Save the download
      const fileName = `kimai-export-${format(startDate, 'yyyy-MM-dd')}.csv`;
      const downloadPath = path.join(config.downloads.path, fileName);
      await download.saveAs(downloadPath);
      
      console.log(`Downloaded: ${fileName}`);
      
      // Read the downloaded file
      const csvContent = fs.readFileSync(downloadPath, 'utf8');
      
      // Parse CSV to count records
      const lines = csvContent.split('\n').filter(line => line.trim());
      const recordCount = lines.length - 1; // Subtract header
      
      // Save using versioned storage
      const storage = StorageFactory.create(config);
      const periodId = format(startDate, 'yyyy-MM-dd');
      
      const storageResult = await storage.save(periodId, csvContent, {
        periodNumber,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        extractedBy: 'playwright-export',
        exportMethod: 'browser-automation'
      });
      
      console.log(`✓ Data saved to kimai-data/${periodId}/`);
      console.log(`  - Version: ${storageResult.version}`);
      console.log(`  - Records: ${recordCount}`);
      console.log(`  - New version: ${storageResult.isNewVersion ? 'Yes' : 'No (unchanged)'}`);
      
      // Clean up download
      fs.unlinkSync(downloadPath);
      
      return {
        success: true,
        periodId,
        storageResult,
        recordCount,
        files: {
          csv: `kimai-data/${periodId}/v${storageResult.version}.csv`,
          metadata: `kimai-data/${periodId}/metadata.json`
        }
      };
    } else {
      throw new Error('Could not find CSV export option');
    }
    
  } catch (error) {
    console.error('Export failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Main function to export most recent complete pay period
 * @returns {Promise<Object>} Export results
 */
async function exportMostRecentPayPeriod() {
  try {
    // Validate configuration
    if (!config.kimai.username || !config.kimai.password) {
      throw new Error('KIMAI_USERNAME and KIMAI_PASSWORD must be set in .env file');
    }
    
    // Get most recent complete pay period
    const period = getMostRecentCompletePayPeriod();
    console.log(`\nExporting Pay Period #${period.number}`);
    console.log(`Period: ${format(period.start, 'MMM dd')} - ${format(period.end, 'MMM dd, yyyy')}\n`);
    
    // Export using Playwright
    const result = await exportTimesheetsWithPlaywright(period.start, period.end, period.number);
    
    return {
      period,
      ...result
    };
    
  } catch (error) {
    console.error('Export failed:', error.message);
    throw error;
  }
}

// Export functions for use in other scripts
module.exports = {
  getMostRecentCompletePayPeriod,
  exportTimesheetsWithPlaywright,
  exportMostRecentPayPeriod
};

// Run if called directly
if (require.main === module) {
  // Check if Playwright is installed
  try {
    require('playwright');
  } catch (error) {
    console.error('Playwright is not installed. Please run:');
    console.error('npm install playwright');
    console.error('npx playwright install chromium');
    process.exit(1);
  }
  
  exportMostRecentPayPeriod()
    .then(result => {
      console.log('\nExport completed successfully!');
      console.log('Files:', result.files);
      process.exit(0);
    })
    .catch(error => {
      console.error('\nExport failed:', error);
      process.exit(1);
    });
}