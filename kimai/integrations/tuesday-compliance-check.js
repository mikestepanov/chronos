#!/usr/bin/env node

const PumbleComplianceBot = require('./pumble-compliance-bot');
const PumbleClient = require('../../lib/pumble-client');
require('dotenv').config();

/**
 * Tuesday Compliance Check
 * Run this every Tuesday to check for timesheet offenders
 */
async function runComplianceCheck() {
  console.log(`\n${'='.repeat(50)}`);
  console.log('TUESDAY COMPLIANCE CHECK');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(50)}\n`);

  try {
    // Initialize Pumble client
    const pumbleClient = new PumbleClient({
      apiToken: process.env.PUMBLE_API_TOKEN,
      workspaceId: process.env.PUMBLE_WORKSPACE_ID
    });

    // Initialize compliance bot
    const bot = new PumbleComplianceBot({
      pumbleClient,
      botUserId: process.env.PUMBLE_BOT_USER_ID,
      botName: process.env.PUMBLE_BOT_NAME || 'timesheet-bot',
      adminUserId: process.env.PUMBLE_ADMIN_USER_ID, // Your user ID
      minHoursPerDay: parseInt(process.env.MIN_HOURS_PER_DAY || '8'),
      expectedDaysPerPeriod: parseInt(process.env.EXPECTED_DAYS_PER_PERIOD || '10')
    });

    // Run compliance check
    const result = await bot.checkTuesdayCompliance();

    console.log('\nCompliance Check Results:');
    console.log(`- Period: ${result.period}`);
    console.log(`- Offenders found: ${result.offendersCount}`);
    
    if (result.offendersCount > 0) {
      console.log(`- Offenders: ${result.offenders.join(', ')}`);
      console.log('\n✅ Created compliance chats for all offenders');
    } else {
      console.log('\n✅ All users are compliant!');
    }

  } catch (error) {
    console.error('\n❌ Compliance check failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runComplianceCheck();
}

module.exports = runComplianceCheck;