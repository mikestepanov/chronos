#!/usr/bin/env node

const BiweeklyReminderService = require('../kimai/services/BiweeklyReminderService');
const PayPeriodCalculator = require('../shared/pay-period-calculator');

/**
 * Biweekly Reminder Cron Job
 * 
 * Usage:
 *   node biweekly-reminder.js <type> <channel-ids>
 * 
 * Arguments:
 *   type: 'advance' or 'reminder'
 *   channel-ids: Comma-separated list of channel IDs
 * 
 * Example:
 *   node biweekly-reminder.js advance C06MVPXQ8CB,C06MW1Y59US
 *   node biweekly-reminder.js reminder 686ca38e83b6fa7714e50f3d
 */

async function run() {
  const type = process.argv[2] || 'advance';
  const channelIds = process.argv[3] ? process.argv[3].split(',').map(id => id.trim()) : [];
  const payPeriodCalc = new PayPeriodCalculator();
  
  try {
    console.log(`[${new Date().toISOString()}] Running biweekly ${type}`);
    
    // Check if today is a pay period end Monday
    if (!payPeriodCalc.isPayPeriodEndMonday()) {
      console.log('ℹ️  Not a pay period end Monday, skipping');
      process.exit(0);
    }
    
    console.log('✅ Today is a pay period end Monday');
    
    // Get current pay period
    const payPeriod = payPeriodCalc.getCurrentPayPeriod();
    
    // Initialize service and run
    const service = new BiweeklyReminderService();
    await service.run(type, channelIds, payPeriod);
    
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