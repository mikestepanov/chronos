#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');
const StorageFactory = require('../kimai/storage/StorageFactory');
const { identifyPayPeriodsFromCSV } = require('./identify-pay-period');
require('dotenv').config();

// Configuration
const config = {
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
 * Import a Kimai CSV export into the versioned storage system
 * @param {string} csvPath - Path to the CSV file to import
 * @returns {Promise<Object>} Import results
 */
async function importKimaiCSV(csvPath) {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }
  
  // Identify which pay period(s) this CSV covers
  const periodInfo = identifyPayPeriodsFromCSV(csvPath);
  
  if (periodInfo.periods.length === 0) {
    throw new Error('No valid pay period data found in CSV');
  }
  
  if (periodInfo.periods.length > 1) {
    console.warn(`Warning: CSV contains data from ${periodInfo.periods.length} different pay periods.`);
    console.warn('Will import to the primary period with most entries.');
  }
  
  const targetPeriod = periodInfo.summary.primaryPeriod;
  const periodId = format(targetPeriod.startDate, 'yyyy-MM-dd');
  
  console.log(`Importing to Pay Period #${targetPeriod.number}`);
  console.log(`Period: ${format(targetPeriod.startDate, 'MMM dd')} - ${format(targetPeriod.endDate, 'MMM dd, yyyy')}`);
  console.log(`Entries: ${targetPeriod.entries}`);
  
  // Read CSV content
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  
  // Create storage instance
  const storage = StorageFactory.create(config);
  
  // Save using versioned storage
  const storageResult = await storage.save(periodId, csvContent, {
    periodNumber: targetPeriod.number,
    startDate: targetPeriod.startDate.toISOString(),
    endDate: targetPeriod.endDate.toISOString(),
    importedFrom: path.basename(csvPath),
    importedAt: new Date().toISOString(),
    extractedBy: 'manual-import'
  });
  
  console.log(`\n✓ Data imported to kimai-data/${periodId}/`);
  console.log(`  - Version: ${storageResult.version}`);
  console.log(`  - Records: ${storageResult.recordCount}`);
  console.log(`  - New version: ${storageResult.isNewVersion ? 'Yes' : 'No (data unchanged)'}`);
  
  return {
    periodId,
    periodNumber: targetPeriod.number,
    storageResult,
    files: {
      csv: `kimai-data/${periodId}/v${storageResult.version}.csv`,
      metadata: `kimai-data/${periodId}/metadata.json`
    }
  };
}

// Run if called directly
if (require.main === module) {
  const csvPath = process.argv[2];
  
  if (!csvPath) {
    console.error('Error: Please provide a CSV file path');
    console.error('Usage: node import-kimai-csv.js <csv-file-path>');
    process.exit(1);
  }
  
  importKimaiCSV(csvPath)
    .then(result => {
      console.log('\nImport completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\nImport failed:', error.message);
      process.exit(1);
    });
}

module.exports = { importKimaiCSV };