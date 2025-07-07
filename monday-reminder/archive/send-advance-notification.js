#!/usr/bin/env node

/**
 * Send Advance Notification
 * Run this at 8 AM on Mondays to notify Mikhail about upcoming reminders
 */

const ConfigLoader = require('../shared/config-loader');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const PumbleClient = require('../shared/pumble-client');
const { format } = require('date-fns');
require('dotenv').config();

async function sendAdvanceNotification() {
  const config = ConfigLoader.load();
  const pumble = new PumbleClient(config.messaging.pumble);
  
  const payPeriodCalc = new PayPeriodCalculator({
    basePeriodNumber: 18,
    basePeriodEndDate: new Date('2025-06-23T12:00:00'),
    periodLengthDays: 14,
    paymentDelayDays: 7
  });

  const now = new Date();
  console.log(`[${format(now, 'yyyy-MM-dd HH:mm')}] Checking if advance notification needed...`);

  // Check if today is the last day of a pay period
  if (!payPeriodCalc.isLastDayOfPeriod(now)) {
    console.log('Today is not the last day of a pay period. No notification needed.');
    return;
  }

  // Generate message preview
  const periodData = payPeriodCalc.generateBotFormattedMessage('agentsmith', { referenceDate: now });
  const periodInfo = payPeriodCalc.getCurrentPeriodInfo(now);
  
  const notification = `🔔 **Monday Reminder - 1 Hour Notice**

⏰ **Reminders will be sent at:** 9:00 AM
📍 **Target Channels:** #dev, #design
📋 **Type:** Monday Timesheet Reminder

📊 **Pay Period Details:**
• Period: ${periodInfo.currentPeriod.number}
• Dates: ${format(periodInfo.currentPeriod.startDate, 'M/d')} - ${format(periodInfo.currentPeriod.endDate, 'M/d')}
• Payment: ${format(periodInfo.currentPeriod.paymentDate, 'MMM d')}

📝 **Message Preview:**
Good Morning Team,

A Quick Reminder: The ${periodData.periodOrdinal} pay-period is fast approaching!

Please begin to input Kimai data today (${periodData.endDateLong}) end of day...

_The full reminder will be sent to both channels at 9:00 AM._`;

  try {
    await pumble.sendMessage(
      process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID,
      notification
    );
    console.log('✅ Advance notification sent to Mikhail');
  } catch (error) {
    console.error('❌ Failed to send advance notification:', error.message);
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  sendAdvanceNotification()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}