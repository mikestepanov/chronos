// Test Monday reminder message format
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const { format } = require('date-fns');

// Create calculator
const calc = new PayPeriodCalculator({
  basePeriodNumber: 18,
  basePeriodEndDate: new Date('2025-06-23T12:00:00'),
  periodLengthDays: 14,
  paymentDelayDays: 7
});

// Test for July 7, 2025 (Monday - last day of period 19)
const testDate = new Date('2025-07-07T07:00:00'); // 7 AM Monday
const periodData = calc.generateBotFormattedMessage('agentsmith', { referenceDate: testDate });

console.log('=== AGENT SMITH MONDAY REMINDER ===');
console.log(`Date: ${format(testDate, 'EEEE, MMMM d, yyyy')} at 7:00 AM CST`);
console.log(`Period: ${periodData.periodNumber}`);
console.log('\n--- MESSAGE ---\n');

// Simulate the message
const message = `🕴️ System Notice: Pay Period ${periodData.periodOrdinal} Termination

Good Morning Team.

The current pay period cycle reaches its inevitable termination today.

System Requirements:
• Submit all temporal data by end of day today (${periodData.endDateLong})
• Current cycle encompasses: ${periodData.startDate} – ${periodData.endDate}
• Today (${periodData.endDateLong}) is the final day of period ${periodData.periodNumber}
• Tomorrow (${periodData.tomorrowDate}) initiates period ${periodData.nextPeriodNumber}

Additional Directives:
• Those assigned supplementary hours must include them in current submissions
• All entries require proper documentation and categorization

Processing Timeline:
• Payment transmission scheduled: ${periodData.paymentDate}
• System processing is automatic and inevitable

Compliance is not optional. Direct queries to management if clarification is required.

~ Agent Smith`;

console.log(message);

// Show next few Monday reminder dates
console.log('\n\n=== UPCOMING MONDAY REMINDERS ===\n');
const mondays = [
  new Date('2025-06-23T07:00:00'), // Period 18 end
  new Date('2025-07-07T07:00:00'), // Period 19 end
  new Date('2025-07-21T07:00:00'), // Period 20 end
  new Date('2025-08-04T07:00:00'), // Period 21 end
  new Date('2025-08-18T07:00:00')  // Period 22 end
];

mondays.forEach(monday => {
  const info = calc.getCurrentPeriodInfo(monday);
  const daysUntilEnd = calc.getDaysUntilPeriodEnd(monday);
  console.log(`${format(monday, 'MMM d, yyyy')}:`);
  console.log(`  Period ${info.currentPeriod.number} ends ${format(info.currentPeriod.endDate, 'MMM d')}`);
  console.log(`  Days until end: ${daysUntilEnd}`);
  console.log(`  Send reminder: ${daysUntilEnd <= 6 && daysUntilEnd >= 0 ? 'YES' : 'NO'}`);
});