#!/usr/bin/env node

/**
 * Pull pay periods 18-22
 */

const { pullKimaiData } = require('./scripts/pull-kimai');
const PayPeriodCalculator = require('./shared/pay-period-calculator');

async function pullPayPeriods() {
  const calculator = new PayPeriodCalculator();
  const periods = [];

  // Calculate periods 18-22
  for (let periodNum = 18; periodNum <= 22; periodNum++) {
    // Calculate period dates based on the base period
    const daysSinceBase = (periodNum - calculator.basePeriodNumber) * calculator.periodLengthDays;
    const periodEnd = new Date(calculator.basePeriodEndDate);
    periodEnd.setDate(periodEnd.getDate() + daysSinceBase);
    
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - (calculator.periodLengthDays - 1));

    periods.push({
      number: periodNum,
      start: periodStart,
      end: periodStart // Use start of day for end to avoid timezone issues
    });
  }

  console.log('🔍 Pulling data for pay periods 18-22...\n');

  for (const period of periods) {
    console.log(`\n📊 === Pay Period ${period.number} ===`);
    try {
      // Adjust end date to be the actual end of the period
      const adjustedEnd = new Date(period.start);
      adjustedEnd.setDate(adjustedEnd.getDate() + 13); // 14 days total (0-13)
      
      const result = await pullKimaiData({
        period: {
          number: period.number,
          start: period.start,
          end: adjustedEnd
        },
        displayReport: true
      });
      
      console.log(`✅ Successfully pulled Pay Period ${period.number}`);
      console.log(`   Records: ${result.stats.filteredRecords} filtered from ${result.stats.totalRecords}`);
      
    } catch (error) {
      console.error(`❌ Failed to pull Pay Period ${period.number}:`, error.message);
    }
  }
}

// Run the period pulls
pullPayPeriods()
  .then(() => {
    console.log('\n✨ All pay period pulls completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Pay period pull failed:', error.message);
    process.exit(1);
  });