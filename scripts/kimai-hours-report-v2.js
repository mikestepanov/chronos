#!/usr/bin/env node

/**
 * Kimai Hours Report Generator v2
 * 
 * This version relies on manual CSV exports from Kimai web interface
 * to ensure data accuracy. The API-based approach has been deprecated
 * due to inconsistencies in the returned data.
 * 
 * Usage:
 * 1. Run without arguments to see export instructions:
 *    node scripts/kimai-hours-report-v2.js
 * 
 * 2. Run with CSV file to process it:
 *    node scripts/kimai-hours-report-v2.js ~/Downloads/export.csv
 */

const { displayExportInstructions, processManualExport, getMostRecentCompletePayPeriod } = require('./kimai-manual-export-helper');

// Main execution
if (require.main === module) {
  const csvPath = process.argv[2];
  
  if (!csvPath) {
    console.log('\n📊 Kimai Hours Report Generator v2\n');
    console.log('This tool helps you export and analyze Kimai timesheet data.');
    console.log('Due to API inconsistencies, we now use manual CSV exports.\n');
    
    const period = getMostRecentCompletePayPeriod();
    displayExportInstructions(period);
    
  } else {
    processManualExport(csvPath)
      .then(() => {
        console.log('\n✅ Hours report generated successfully!');
        process.exit(0);
      })
      .catch(error => {
        console.error('\n❌ Failed to generate report:', error.message);
        process.exit(1);
      });
  }
}