#!/usr/bin/env node

// Check if Playwright is available
let playwright;
try {
  playwright = require('playwright');
} catch (error) {
  console.error('\n⚠️  Playwright is not installed.');
  console.error('\nTo install Playwright, run:');
  console.error('  ./scripts/install-playwright.sh');
  console.error('\nOr manually:');
  console.error('  pnpm install');
  console.error('  pnpm exec playwright install chromium');
  console.error('\nFalling back to manual mode...\n');
  
  // Fall back to simple mode
  require('./pull-kimai-simple');
  return;
}

const { chromium } = playwright;
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const StorageFactory = require('../kimai/storage/StorageFactory');
const { generateHoursReport, formatReportAsTable } = require('./kimai-hours-report');
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
  usersConfigPath: path.join(__dirname, '../config/users/users.json'),
  downloads: {
    path: path.join(__dirname, '../temp-downloads')
  },
  browser: {
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    timeout: 30000
  }
};

/**
 * Get the most recent complete pay period
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
 * Pull data from Kimai using Playwright automation
 */
async function pullKimaiData(options = {}) {
  const period = options.period || getMostRecentCompletePayPeriod();
  
  console.log(`\n🚀 Pulling Kimai data for Pay Period #${period.number}`);
  console.log(`📅 Period: ${format(period.start, 'MMM dd')} - ${format(period.end, 'MMM dd, yyyy')}\n`);
  
  // Validate credentials
  if (!config.kimai.username || !config.kimai.password) {
    throw new Error('❌ KIMAI_USERNAME and KIMAI_PASSWORD must be set in .env file');
  }
  
  // Setup downloads directory
  if (!fs.existsSync(config.downloads.path)) {
    fs.mkdirSync(config.downloads.path, { recursive: true });
  }
  
  // Clean old downloads
  const files = fs.readdirSync(config.downloads.path);
  files.forEach(file => {
    if (file.endsWith('.csv')) {
      fs.unlinkSync(path.join(config.downloads.path, file));
    }
  });
  
  const browser = await chromium.launch({ 
    headless: config.browser.headless 
  });
  
  try {
    const context = await browser.newContext({
      acceptDownloads: true
    });
    
    const page = await context.newPage();
    page.setDefaultTimeout(config.browser.timeout);
    
    // Login
    console.log('🔐 Logging in to Kimai...');
    await page.goto(config.kimai.baseUrl);
    await page.fill('input[name="username"]', config.kimai.username);
    await page.fill('input[name="password"]', config.kimai.password);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.main-header', { timeout: 10000 });
    console.log('✅ Login successful');
    
    // Navigate directly to timesheets with date filter
    console.log('📋 Navigating to timesheets with date filter...');
    
    // Format dates as M/D/YYYY for URL
    const startMonth = period.start.getMonth() + 1; // JavaScript months are 0-based
    const startDay = period.start.getDate();
    const startYear = period.start.getFullYear();
    const endMonth = period.end.getMonth() + 1;
    const endDay = period.end.getDate();
    const endYear = period.end.getFullYear();
    
    const dateRangeParam = `${startMonth}/${startDay}/${startYear}+-+${endMonth}/${endDay}/${endYear}`;
    
    // Build URL with parameters matching the example
    const timesheetUrl = `${config.kimai.baseUrl}/en/team/timesheet/?daterange=${encodeURIComponent(dateRangeParam)}&state=1&billable=0&exported=1&size=50&page=1&orderBy=begin&order=DESC`;
    
    console.log(`🔍 Date range: ${startMonth}/${startDay}/${startYear} - ${endMonth}/${endDay}/${endYear}`);
    
    // Navigate to the filtered timesheet page
    await page.goto(timesheetUrl);
    await page.waitForSelector('.datatable, table.dataTable, .table', { timeout: 15000 });
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    console.log(`✅ Timesheet loaded with date filter`);
    
    // Export CSV
    console.log('💾 Exporting CSV...');
    
    // Look for the export button - typically in the toolbar or actions area
    const exportSelectors = [
      // Common Kimai export button patterns
      'a[title*="Export"]',
      'button[title*="Export"]',
      'a.btn-export',
      '.page-actions a[href*="export"]',
      '.toolbar a[href*="export"]',
      // Dropdown patterns
      'button[data-toggle="dropdown"]:has-text("Export")',
      'a.dropdown-toggle:has-text("Export")',
      '.btn-group button:has-text("Export")',
      // Generic patterns
      'a:has-text("Export")',
      'button:has-text("Export")'
    ];
    
    let exportButton = null;
    for (const selector of exportSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible()) {
        exportButton = button;
        break;
      }
    }
    
    if (!exportButton) {
      // Try looking for an icon-based export button
      const iconSelectors = [
        'a[class*="export"]',
        'button[class*="export"]',
        'a[title*="xport"]',
        'button[title*="xport"]'
      ];
      
      for (const selector of iconSelectors) {
        const button = page.locator(selector).first();
        if (await button.isVisible()) {
          exportButton = button;
          break;
        }
      }
    }
    
    if (!exportButton) {
      throw new Error('Could not find export button');
    }
    
    await exportButton.click();
    console.log('✅ Export button clicked');
    
    // Wait for dropdown/modal to appear
    await page.waitForTimeout(500);
    
    // Look for CSV export option
    const csvSelectors = [
      // Direct CSV links
      'a[href*="/export/csv"]',
      'a[href*="format=csv"]',
      'a[href*="type=csv"]',
      // Text-based selectors
      'a:has-text("CSV")',
      'button:has-text("CSV")',
      // In dropdown menus
      '.dropdown-menu a:has-text("CSV")',
      'ul.dropdown-menu a:has-text("CSV")',
      // In modals
      '.modal a:has-text("CSV")',
      '.modal button:has-text("CSV")'
    ];
    
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    
    let csvLink = null;
    for (const selector of csvSelectors) {
      const link = page.locator(selector).first();
      if (await link.isVisible()) {
        csvLink = link;
        break;
      }
    }
    
    if (!csvLink) {
      throw new Error('Could not find CSV export option');
    }
    
    await csvLink.click();
    console.log('✅ CSV export initiated');
    
    console.log('⏳ Waiting for download...');
    const download = await downloadPromise;
    
    // Save download
    const fileName = `kimai-export-${format(period.start, 'yyyy-MM-dd')}.csv`;
    const downloadPath = path.join(config.downloads.path, fileName);
    await download.saveAs(downloadPath);
    console.log(`✅ Downloaded: ${fileName}`);
    
    // Process the CSV
    const csvContent = fs.readFileSync(downloadPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const recordCount = Math.max(0, lines.length - 1);
    
    // Save to versioned storage
    const storage = StorageFactory.create(config);
    const periodId = format(period.start, 'yyyy-MM-dd');
    
    const storageResult = await storage.save(periodId, csvContent, {
      periodNumber: period.number,
      startDate: period.start.toISOString(),
      endDate: period.end.toISOString(),
      extractedBy: 'pull-kimai',
      exportMethod: 'playwright-automation'
    });
    
    console.log(`\n✅ Data saved to kimai-data/${periodId}/`);
    console.log(`  - Version: ${storageResult.version}`);
    console.log(`  - Records: ${recordCount}`);
    console.log(`  - New version: ${storageResult.isNewVersion ? 'Yes' : 'No (unchanged)'}`);
    
    // Generate hours report
    if (options.generateReport !== false) {
      console.log('\n📊 Generating hours report...');
      
      // Parse CSV to get timesheet data
      const { parse } = require('csv-parse/sync');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true
      });
      
      // Convert to timesheet format
      const timesheets = records
        .filter(record => record.Date && /^\d{4}-\d{2}-\d{2}$/.test(record.Date))
        .map(record => {
          const durationParts = (record.Duration || '0:00').split(':');
          const hours = parseInt(durationParts[0] || 0);
          const minutes = parseInt(durationParts[1] || 0);
          const durationSeconds = (hours * 3600) + (minutes * 60);
          
          // Map username to user ID
          const users = JSON.parse(fs.readFileSync(config.usersConfigPath, 'utf8'));
          const username = record.User?.toLowerCase();
          const user = users.users.find(u => 
            u.services?.kimai?.username?.toLowerCase() === username
          );
          
          return {
            user: user?.services?.kimai?.id || username,
            duration: durationSeconds,
            date: record.Date,
            project: record.Project,
            activity: record.Activity
          };
        });
      
      // Generate report
      const users = JSON.parse(fs.readFileSync(config.usersConfigPath, 'utf8'));
      const report = generateHoursReport(timesheets, users);
      const table = formatReportAsTable(report);
      
      // Save report
      const reportPath = path.join(config.storage.basePath, periodId, 'hours-report.txt');
      const reportContent = 
        `Hours Compliance Report - Pay Period #${period.number}\n` +
        `Period: ${format(period.start, 'MMM dd')} - ${format(period.end, 'MMM dd, yyyy')}\n` +
        `Generated: ${new Date().toISOString()}\n` +
        `Source: Automated pull\n\n` +
        table;
      
      fs.writeFileSync(reportPath, reportContent, 'utf8');
      console.log(`✅ Report saved to ${reportPath}`);
      
      // Display report
      console.log('\n' + table);
    }
    
    // Clean up
    fs.unlinkSync(downloadPath);
    
    return {
      success: true,
      period,
      periodId,
      storageResult,
      recordCount
    };
    
  } catch (error) {
    console.error('\n❌ Export failed:', error.message);
    
    // Take screenshot for debugging if page exists
    try {
      const pages = context.pages();
      if (pages.length > 0) {
        const screenshotPath = path.join(config.downloads.path, 'error-screenshot.png');
        await pages[0].screenshot({ path: screenshotPath, fullPage: true });
        console.error(`📸 Screenshot saved to: ${screenshotPath}`);
      }
    } catch (screenshotError) {
      console.error('Could not take screenshot:', screenshotError.message);
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Export for use in other scripts
module.exports = { pullKimaiData, getMostRecentCompletePayPeriod };

// Run if called directly
if (require.main === module) {
  pullKimaiData()
    .then(result => {
      console.log('\n✨ Pull completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Pull failed:', error.message);
      process.exit(1);
    });
}