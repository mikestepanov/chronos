#!/usr/bin/env node

const KimaiExtractionService = require('./index');
const { format } = require('date-fns');
const fs = require('fs').promises;
const path = require('path');

/**
 * Kimai Scheduler
 * Automated extraction based on configuration
 */
class KimaiScheduler {
  constructor() {
    this.service = new KimaiExtractionService();
    this.logFile = path.join(__dirname, '../logs/kimai-scheduler.log');
  }

  async log(message) {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const logEntry = `[${timestamp}] ${message}\n`;
    
    console.log(message);
    
    try {
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      // Ignore logging errors
    }
  }

  async run() {
    await this.log('Kimai Scheduler starting...');
    
    try {
      // Check if extraction is needed
      if (!this.service.shouldExtractToday()) {
        const status = await this.service.getStatus();
        await this.log(`Extraction not needed. Current period day: ${status.currentPeriod.daysElapsed}`);
        return;
      }

      // Extract current period
      await this.log('Extraction needed. Starting extraction...');
      const result = await this.service.extractCurrent();
      
      if (result.success) {
        await this.log(`Extraction successful. Version: ${result.metadata.version}, Records: ${result.metadata.recordCount}`);
        
        // Check for changes
        const history = await this.service.getHistory(result.periodId);
        if (history.length > 1) {
          const prevVersion = history[history.length - 2].version;
          const diff = await this.service.storage.compareVersions(
            result.periodId,
            prevVersion,
            result.metadata.version
          );
          
          if (diff.hasChanges) {
            await this.log(`Changes detected: ${diff.addedRecords.length} added, ${diff.removedRecords.length} removed`);
          }
        }
      } else {
        await this.log(`Extraction failed: ${result.error.message}`);
        process.exit(1);
      }
    } catch (error) {
      await this.log(`Scheduler error: ${error.message}`);
      process.exit(1);
    }
    
    await this.log('Kimai Scheduler completed');
  }
}

// Run if executed directly
if (require.main === module) {
  const scheduler = new KimaiScheduler();
  scheduler.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}