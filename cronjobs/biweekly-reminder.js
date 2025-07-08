#!/usr/bin/env node

const BiweeklyReminderService = require('../kimai/services/BiweeklyReminderService');
const PayPeriodCalculator = require('../shared/pay-period-calculator');

/**
 * Biweekly Reminder Cron Job
 * Runs every Monday at 7 AM and 8:30 AM CST
 * 
 * This cronjob handles the scheduling logic:
 * - Checks if today is a pay period end Monday
 * - If yes, calls the reminder service
 * - If no, skips execution
 */

async function run() {
  const type = process.argv[2] || 'advance';
  const payPeriodCalc = new PayPeriodCalculator();
  
  try {
    console.log(`[${new Date().toISOString()}] Checking if biweekly reminder should run (${type})`);
    
    // Check if today is a pay period end Monday
    if (!payPeriodCalc.isPayPeriodEndMonday()) {
      console.log('ℹ️  Not a pay period end Monday, skipping');
      process.exit(0);
    }
    
    console.log('✅ Today is a pay period end Monday, sending reminders');
    
    // Get current pay period
    const payPeriod = payPeriodCalc.getCurrentPayPeriod();
    
    // Initialize service and send reminders
    const service = new BiweeklyReminderService();
    await service.run(type, payPeriod);
    
    console.log('✅ Biweekly reminder completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  run();
}