#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const PayPeriodCalculator = require('../shared/pay-period-calculator');

/**
 * Identify which pay period(s) a CSV file covers based on the dates in it
 * @param {string} csvPath - Path to the CSV file
 * @returns {Object} Information about the pay periods covered
 */
function identifyPayPeriodsFromCSV(csvPath) {
  const calculator = new PayPeriodCalculator();
  
  // Read and parse CSV
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });
  
  // Extract valid dates
  const dates = records
    .map(record => record.Date)
    .filter(date => date && /^\d{4}-\d{2}-\d{2}$/.test(date))
    .map(date => new Date(date + 'T00:00:00'));
  
  if (dates.length === 0) {
    throw new Error('No valid dates found in CSV');
  }
  
  // Find min and max dates
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  
  // Identify pay periods
  const periods = new Map();
  
  dates.forEach(date => {
    const periodInfo = calculator.getCurrentPeriodInfo(date);
    const periodKey = periodInfo.currentPeriod.number;
    
    if (!periods.has(periodKey)) {
      periods.set(periodKey, {
        number: periodInfo.currentPeriod.number,
        startDate: periodInfo.currentPeriod.startDate,
        endDate: periodInfo.currentPeriod.endDate,
        entries: 0,
        dates: new Set()
      });
    }
    
    const period = periods.get(periodKey);
    period.entries++;
    period.dates.add(date.toISOString().split('T')[0]);
  });
  
  // Convert to array and sort by period number
  const periodArray = Array.from(periods.values()).sort((a, b) => a.number - b.number);
  
  return {
    dateRange: {
      min: minDate,
      max: maxDate
    },
    periods: periodArray,
    summary: {
      totalEntries: dates.length,
      totalPeriods: periodArray.length,
      primaryPeriod: periodArray.reduce((max, period) => 
        period.entries > (max?.entries || 0) ? period : max, null)
    }
  };
}

/**
 * Format period info for display
 * @param {Object} info - Period information from identifyPayPeriodsFromCSV
 * @returns {string} Formatted output
 */
function formatPeriodInfo(info) {
  let output = `CSV Date Range: ${info.dateRange.min.toISOString().split('T')[0]} to ${info.dateRange.max.toISOString().split('T')[0]}\n`;
  output += `Total Entries: ${info.summary.totalEntries}\n\n`;
  
  output += 'Pay Periods Found:\n';
  info.periods.forEach(period => {
    const startStr = period.startDate.toISOString().split('T')[0];
    const endStr = period.endDate.toISOString().split('T')[0];
    const percentage = ((period.entries / info.summary.totalEntries) * 100).toFixed(1);
    
    output += `\nPeriod #${period.number}: ${startStr} to ${endStr}\n`;
    output += `  Entries: ${period.entries} (${percentage}%)\n`;
    output += `  Dates: ${Array.from(period.dates).sort().join(', ')}\n`;
  });
  
  if (info.summary.primaryPeriod) {
    output += `\nPrimary Period: #${info.summary.primaryPeriod.number} with ${info.summary.primaryPeriod.entries} entries\n`;
  }
  
  return output;
}

// Export for use in other scripts
module.exports = {
  identifyPayPeriodsFromCSV,
  formatPeriodInfo
};

// Run if called directly
if (require.main === module) {
  const csvPath = process.argv[2] || '20250723-kimai-export.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: CSV file not found: ${csvPath}`);
    console.error('Usage: node identify-pay-period.js [csv-file-path]');
    process.exit(1);
  }
  
  try {
    console.log(`Analyzing: ${csvPath}\n`);
    const info = identifyPayPeriodsFromCSV(csvPath);
    console.log(formatPeriodInfo(info));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}