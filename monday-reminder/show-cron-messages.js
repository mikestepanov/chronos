#!/usr/bin/env node

// This shows EXACTLY what messages the cron job sends

const PayPeriodCalculator = require('../shared/pay-period-calculator');
const { format } = require('date-fns');

console.log('🚀 GitHub Actions Monday Reminder - Message Preview\n');
console.log('This is EXACTLY what gets sent every Monday:\n');

// Calculate current pay period info
const calculator = new PayPeriodCalculator();
const periodInfo = calculator.getCurrentPeriodInfo();
const { currentPeriod } = periodInfo;

console.log('=====================================');
console.log('MESSAGE 1: 6 AM CST - DM to Mikhail');
console.log('=====================================\n');

const advanceMessage = `🔔 **Monday Reminder - 1 Hour Notice**

Good morning! This is a friendly heads-up that Monday timesheet reminders will be sent in 1 hour.

⏰ **Reminders will be sent at:** 7:00 AM CST
📍 **Target Channels:** #dev, #design  
📋 **Type:** Monday Timesheet Reminder

📊 **Pay Period Details:**
• Period: ${currentPeriod.number}
• Dates: ${format(currentPeriod.startDate, 'M/d')} - ${format(currentPeriod.endDate, 'M/d')}
• Payment: ${format(currentPeriod.paymentDate, 'MMMM do')}

_You're receiving this because you're configured as a reminder administrator._`;

console.log(advanceMessage);

console.log('\n\n=====================================');
console.log('MESSAGE 2: 7 AM CST - Channels (#dev, #design)');
console.log('=====================================\n');

const mainMessage = calculator.generateReminderMessage({
  teamName: 'Team',
  includeExtraHours: true
});

console.log(mainMessage);

console.log('\n\n=====================================');
console.log('SCHEDULE');
console.log('=====================================');
console.log('These messages are sent EVERY MONDAY:');
console.log('- 6:00 AM CST (11:00 UTC) - Advance notice to Mikhail\'s DM');
console.log('- 7:00 AM CST (12:00 UTC) - Main reminder to #dev and #design');
console.log('\nGitHub Actions handles this automatically.');
console.log('No local cron jobs needed!');