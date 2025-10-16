/**
 * KimaiExporter - Handles browser automation for exporting Kimai data
 * 
 * This service is responsible for:
 * - Logging into Kimai
 * - Navigating to timesheet pages
 * - Exporting CSV data
 */

const fs = require('fs');
const path = require('path');

class KimaiExporter {
  constructor(config) {
    this.config = config;
    this.playwright = null;
    this.browserType = config.browser?.type || 'firefox';
    this.headless = config.browser?.headless !== false;
  }

  /**
   * Initialize Playwright
   */
  async init() {
    try {
      this.playwright = require('playwright');
    } catch (error) {
      throw new Error('Playwright is not installed. Run: npx playwright install firefox');
    }
  }

  /**
   * Export timesheet data for a specific date range
   * @param {Date} startDate - Start date of the period
   * @param {Date} endDate - End date of the period
   * @returns {Object} Export result with CSV data and metadata
   */
  async exportTimesheet(startDate, endDate) {
    await this.init();
    
    const browser = await this.playwright[this.browserType].launch({ 
      headless: this.headless 
    });
    
    try {
      const context = await browser.newContext({
        acceptDownloads: true
      });
      
      const page = await context.newPage();
      page.setDefaultTimeout(this.config.browser?.timeout || 30000);
      
      // Login
      await this.login(page);
      
      // Navigate and apply filters
      await this.navigateToFilteredTimesheet(page, startDate, endDate);
      
      // Export CSV
      const csvData = await this.exportCSV(page, context);
      
      return {
        success: true,
        csvData,
        exportedAt: new Date(),
        dateRange: {
          start: startDate,
          end: endDate
        }
      };
      
    } catch (error) {
      // Try to take screenshot for debugging
      try {
        const pages = context.pages();
        if (pages.length > 0) {
          const screenshotDir = path.join(process.cwd(), 'temp-downloads');
          fs.mkdirSync(screenshotDir, { recursive: true });
          const screenshotPath = path.join(screenshotDir, 'kimai-export-error.png');
          await pages[0].screenshot({ path: screenshotPath, fullPage: true });
          console.error(`📸 Error screenshot saved to: ${screenshotPath}`);
        }
      } catch (screenshotError) {
        // Ignore screenshot errors
      }
      
      throw error;
    } finally {
      await browser.close();
    }
  }

  /**
   * Login to Kimai
   */
  async login(page) {
    console.log('🔐 Logging in to Kimai...');
    
    await page.goto(this.config.kimai.baseUrl);
    await page.waitForSelector('input[name="_username"]', { timeout: 10000 });
    
    await page.fill('input[name="_username"]', this.config.kimai.username);
    await page.fill('input[name="_password"]', this.config.kimai.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/timesheet/**', { timeout: 15000 });
    console.log('✅ Login successful');
  }

  /**
   * Navigate to team timesheet with date filters
   */
  async navigateToFilteredTimesheet(page, startDate, endDate) {
    console.log('📋 Navigating to team timesheets...');
    
    // First navigate to get CSRF token
    await page.goto(`${this.config.kimai.baseUrl}/en/team/timesheet/`);
    await page.waitForSelector('.datatable, table.dataTable, .table', { timeout: 15000 });
    
    // Extract CSRF token
    const csrfToken = await this.extractCSRFToken(page);
    
    // Format dates for URL
    const dateRange = this.formatDateRange(startDate, endDate);

    // Build filtered URL
    let url = `${this.config.kimai.baseUrl}/en/team/timesheet/?`;
    url += `daterange=${dateRange}`;  // dateRange is already properly encoded
    url += '&state=1&billable=0&exported=1&size=50&page=1&orderBy=begin&order=DESC&searchTerm=';
    
    if (csrfToken) {
      console.log('✅ Found CSRF token');
      url += `&_token=${encodeURIComponent(csrfToken)}`;
    }
    
    url += '&performSearch=performSearch';
    
    console.log(`🔍 Applying date filter: ${dateRange}`);
    
    // Navigate with filters
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check results
    const entriesInfo = await this.getEntriesInfo(page);
    if (entriesInfo) {
      console.log(`✅ Filtered results: ${entriesInfo}`);
    }
  }

  /**
   * Export CSV from current page
   */
  async exportCSV(page, context) {
    console.log('💾 Exporting CSV...');
    
    // Setup download promise
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    
    // Click export button
    const exportButton = await page.locator('button:has-text("Export")').first();
    if (!await exportButton.isVisible()) {
      throw new Error('Could not find export button');
    }
    
    await exportButton.click();
    console.log('✅ Export dropdown opened');
    
    await page.waitForTimeout(1000);
    
    // Click CSV option
    const csvLink = await page.locator('a[href*="/export/csv"]:visible').first();
    
    if (!await csvLink.isVisible()) {
      const textCsvLink = await page.locator('a:has-text("CSV"):visible').first();
      if (await textCsvLink.isVisible()) {
        await textCsvLink.click();
      } else {
        throw new Error('Could not find CSV export option');
      }
    } else {
      await csvLink.click();
    }
    
    console.log('✅ CSV export initiated');
    console.log('⏳ Waiting for download...');
    
    const download = await downloadPromise;
    
    // Save to temp location
    const tempDir = path.join(process.cwd(), 'temp-downloads');
    fs.mkdirSync(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, 'kimai-export.csv');
    await download.saveAs(tempPath);
    
    // Read CSV data
    const csvData = fs.readFileSync(tempPath, 'utf8');
    
    // Clean up
    fs.unlinkSync(tempPath);
    
    console.log('✅ CSV downloaded successfully');
    
    return csvData;
  }

  /**
   * Extract CSRF token from page
   */
  async extractCSRFToken(page) {
    return await page.evaluate(() => {
      const tokenInput = document.querySelector('input[name="_token"], input[name="csrf_token"], input[name="_csrf_token"]');
      if (tokenInput) return tokenInput.value;
      
      const metaToken = document.querySelector('meta[name="csrf-token"], meta[name="_token"]');
      if (metaToken) return metaToken.content;
      
      return null;
    });
  }

  /**
   * Format date range for Kimai URL
   */
  formatDateRange(startDate, endDate) {
    const start = `${startDate.getMonth() + 1}/${startDate.getDate()}/${startDate.getFullYear()}`;
    const end = `${endDate.getMonth() + 1}/${endDate.getDate()}/${endDate.getFullYear()}`;
    // Encode the dates but keep the +-+ separator literal (Kimai requires this format)
    return `${encodeURIComponent(start)}+-+${encodeURIComponent(end)}`;
  }

  /**
   * Get entries info from page
   */
  async getEntriesInfo(page) {
    return await page.$$eval('.box-footer, .card-footer, .datatable-footer, [class*="info"]', elements => {
      for (const el of elements) {
        const text = el.textContent;
        if (text && text.includes('entries')) {
          return text.trim();
        }
      }
      return null;
    });
  }
}

module.exports = KimaiExporter;