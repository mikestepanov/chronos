#!/usr/bin/env node

const { getMostRecentCompletePayPeriod, displayExportInstructions, processManualExport } = require('./kimai-manual-export-helper');

console.log('\n🚀 Kimai Data Pull\n');
console.log('⚠️  Note: Automated pull requires Playwright. Using manual mode.\n');
console.log('To enable automated pull, run:');
console.log('  ./scripts/install-playwright.sh\n');

// Get the most recent pay period
const period = getMostRecentCompletePayPeriod();

// Show export instructions
displayExportInstructions(period);

console.log('\nOnce you\'ve downloaded the CSV, run:');
console.log(`  node scripts/pull-kimai-simple.js ~/Downloads/[filename].csv\n`);

// If CSV path provided, process it
const csvPath = process.argv[2];
if (csvPath) {
  processManualExport(csvPath)
    .then(() => {
      console.log('\n✅ Import completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Import failed:', error.message);
      process.exit(1);
    });
}