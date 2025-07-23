#!/usr/bin/env node

const KimaiExtractionService = require('./index');
const PayPeriod = require('./core/PayPeriod');
const { getConfig } = require('./config');
const { format } = require('date-fns');

/**
 * Kimai CLI
 * Clean command-line interface for manual operations
 */
class KimaiCLI {
  constructor() {
    this.service = new KimaiExtractionService();
    this.payPeriod = new PayPeriod(getConfig().payPeriod);
  }

  async run(args) {
    const command = args[0] || 'help';
    
    try {
      switch (command) {
        case 'extract':
          await this.extract(args.slice(1));
          break;
        case 'status':
          await this.status();
          break;
        case 'history':
          await this.history(args.slice(1));
          break;
        case 'compare':
          await this.compare(args.slice(1));
          break;
        case 'list':
          await this.list();
          break;
        case 'test':
          await this.test();
          break;
        default:
          this.help();
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }

  async extract(args) {
    let period;
    
    if (args.includes('--current') || args.length === 0) {
      // Extract current period
      period = this.payPeriod.getCurrentPeriod();
    } else if (args.includes('--period')) {
      // Extract by period ID or number
      const idx = args.indexOf('--period');
      const value = args[idx + 1];
      
      if (/^\d+$/.test(value)) {
        period = this.payPeriod.getPeriodByNumber(parseInt(value));
      } else {
        period = this.payPeriod.getPeriodById(value);
      }
    } else if (args.includes('--date')) {
      // Extract period containing date
      const idx = args.indexOf('--date');
      const date = new Date(args[idx + 1]);
      period = this.payPeriod.getPeriodForDate(date);
    } else {
      // Default to current
      period = this.payPeriod.getCurrentPeriod();
    }

    console.log(`\nExtracting Period #${period.periodNumber}`);
    console.log(`Dates: ${format(period.startDate, 'MMM dd')} - ${format(period.endDate, 'MMM dd, yyyy')}`);
    console.log(`Period ID: ${period.id}\n`);

    const result = await this.service.extractPeriod(period);
    
    if (result.success) {
      console.log('✓ Extraction successful');
      console.log(`  Version: ${result.metadata.version}`);
      console.log(`  Records: ${result.metadata.recordCount}`);
      console.log(`  Checksum: ${result.metadata.checksum.substring(0, 8)}...`);
    } else {
      console.error('✗ Extraction failed');
      console.error(`  Error: ${result.error.message}`);
    }
  }

  async status() {
    const status = await this.service.getStatus();
    
    console.log('\nKimai Extraction Status');
    console.log('=' .repeat(50));
    
    console.log('\nCurrent Period:');
    console.log(`  Number: #${status.currentPeriod.periodNumber}`);
    console.log(`  Dates: ${format(status.currentPeriod.startDate, 'MMM dd')} - ${format(status.currentPeriod.endDate, 'MMM dd, yyyy')}`);
    console.log(`  Days Elapsed: ${status.currentPeriod.daysElapsed} of 14`);
    console.log(`  Extraction Due: ${status.currentPeriod.extractionDue ? 'Yes' : 'No'}`);
    
    if (status.lastExtraction) {
      console.log('\nLast Extraction:');
      console.log(`  Version: ${status.lastExtraction.version}`);
      console.log(`  Date: ${format(status.lastExtraction.extractedAt, 'MMM dd, yyyy HH:mm')}`);
      console.log(`  Records: ${status.lastExtraction.recordCount}`);
    } else {
      console.log('\nLast Extraction: None');
    }
    
    console.log(`\nStored Periods: ${status.storedPeriods.length}`);
    if (status.storedPeriods.length > 0) {
      console.log(`  Latest: ${status.storedPeriods[status.storedPeriods.length - 1]}`);
    }
  }

  async history(args) {
    let periodId;
    
    if (args.includes('--period')) {
      const idx = args.indexOf('--period');
      periodId = args[idx + 1];
    } else {
      // Default to current period
      periodId = this.payPeriod.getCurrentPeriod().id;
    }

    const history = await this.service.getHistory(periodId);
    
    console.log(`\nExtraction History for Period ${periodId}`);
    console.log('=' .repeat(50));
    
    if (history.length === 0) {
      console.log('No extraction history found');
      return;
    }
    
    history.forEach(entry => {
      console.log(`\nVersion ${entry.version}:`);
      console.log(`  Extracted: ${format(entry.extractedAt, 'MMM dd, yyyy HH:mm:ss')}`);
      console.log(`  Records: ${entry.metadata.recordCount}`);
      console.log(`  Size: ${entry.metadata.bytes} bytes`);
      console.log(`  Checksum: ${entry.checksum.substring(0, 8)}...`);
    });
  }

  async compare(args) {
    if (args.length < 4 || !args.includes('--period')) {
      console.error('Usage: compare --period <periodId> <version1> <version2>');
      return;
    }

    const periodIdx = args.indexOf('--period');
    const periodId = args[periodIdx + 1];
    const version1 = parseInt(args[periodIdx + 2]);
    const version2 = parseInt(args[periodIdx + 3]);

    const diff = await this.service.storage.compareVersions(periodId, version1, version2);
    
    console.log(`\nComparing Period ${periodId}: v${version1} → v${version2}`);
    console.log('=' .repeat(50));
    
    if (!diff.hasChanges) {
      console.log('No changes detected');
      return;
    }
    
    if (diff.addedRecords.length > 0) {
      console.log(`\nAdded Records (${diff.addedRecords.length}):`);
      diff.addedRecords.slice(0, 5).forEach(r => console.log(`  + ${r.substring(0, 80)}...`));
      if (diff.addedRecords.length > 5) {
        console.log(`  ... and ${diff.addedRecords.length - 5} more`);
      }
    }
    
    if (diff.removedRecords.length > 0) {
      console.log(`\nRemoved Records (${diff.removedRecords.length}):`);
      diff.removedRecords.slice(0, 5).forEach(r => console.log(`  - ${r.substring(0, 80)}...`));
      if (diff.removedRecords.length > 5) {
        console.log(`  ... and ${diff.removedRecords.length - 5} more`);
      }
    }
  }

  async list() {
    const periods = await this.service.storage.listPeriods();
    
    console.log('\nStored Pay Periods');
    console.log('=' .repeat(50));
    
    if (periods.length === 0) {
      console.log('No periods stored');
      return;
    }
    
    for (const periodId of periods) {
      const period = this.payPeriod.getPeriodById(periodId);
      const latest = await this.service.storage.getLatest(periodId);
      
      console.log(`\nPeriod #${period.periodNumber} (${periodId}):`);
      console.log(`  Dates: ${format(period.startDate, 'MMM dd')} - ${format(period.endDate, 'MMM dd, yyyy')}`);
      console.log(`  Versions: ${latest.version}`);
      console.log(`  Last Update: ${format(latest.extractedAt, 'MMM dd, yyyy HH:mm')}`);
    }
  }

  async test() {
    console.log('\nTesting Kimai Connection...');
    
    try {
      const connected = await this.service.kimaiAPI.testConnection();
      console.log(`API Connection: ${connected ? '✓ OK' : '✗ Failed'}`);
      
      console.log('\nCurrent Configuration:');
      const config = getConfig();
      console.log(`  Kimai URL: ${config.kimai.baseUrl}`);
      console.log(`  Auth Method: ${config.kimai.apiKey ? 'API Key' : 'Username/Password'}`);
      console.log(`  Pay Period Start: ${config.payPeriod.startDate}`);
      console.log(`  Period Length: ${config.payPeriod.periodDays} days`);
      console.log(`  Extract After: ${config.extraction.extractAfterDays} days`);
      console.log(`  Storage Path: ${config.storage.basePath}`);
    } catch (error) {
      console.error(`Test failed: ${error.message}`);
    }
  }

  help() {
    console.log(`
Kimai Extraction CLI

Usage: node cli.js <command> [options]

Commands:
  extract [options]     Extract timesheet data
    --current          Extract current period (default)
    --period <id>      Extract specific period by ID or number
    --date <date>      Extract period containing date
    
  status               Show current status and configuration
  
  history [options]    Show extraction history
    --period <id>      Period ID (default: current)
    
  compare              Compare two versions
    --period <id> <v1> <v2>
    
  list                 List all stored periods
  
  test                 Test connection and show configuration
  
  help                 Show this help

Examples:
  node cli.js extract                     # Extract current period
  node cli.js extract --period 2024-01-01 # Extract specific period
  node cli.js extract --period 5          # Extract period #5
  node cli.js history --period 2024-01-01 # Show history for period
  node cli.js compare --period 2024-01-01 1 2  # Compare versions
`);
  }
}

// Run CLI
if (require.main === module) {
  const cli = new KimaiCLI();
  cli.run(process.argv.slice(2));
}