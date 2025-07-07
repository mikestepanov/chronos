// Test the original format message
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

console.log('=== ORIGINAL FORMAT MONDAY REMINDER ===');
console.log(`Date: ${format(testDate, 'EEEE, MMMM d, yyyy')} at 7:00 AM CST`);
console.log(`Period: ${periodData.periodNumber}`);
console.log('\n--- MESSAGE ---\n');

// Create the original format message
const message = `Good Morning Team,

A Quick Reminder: The ${periodData.periodOrdinal} pay-period is fast approaching!

Please begin to input Kimai data today (${periodData.endDateLong}) end of day. Please note that this paycheck will account for the full 2 weeks. This ${periodData.periodOrdinal} payroll period will include the dates from ${periodData.startDate} – ${periodData.endDate}. (Meaning that today (${periodData.endDateLong}) is also counted for the ${periodData.periodOrdinal} pay-period, TOMORROW (${periodData.tomorrowDate}) is counted for the ${periodData.nextPeriodOrdinal} pay-period.)

For those of you that have been given extra hours, please ensure to input them into Kimai for this pay-period as well.

Please expect the payment to go through on the ${periodData.paymentDate}.

If you have any questions or concerns, please do not hesitate to reach out to me.

Thank you.`;

console.log(message);

// Show a few more examples
console.log('\n\n=== MORE EXAMPLES ===\n');
const dates = [
  new Date('2025-07-21T07:00:00'), // Period 20
  new Date('2025-08-04T07:00:00'), // Period 21
];

dates.forEach(date => {
  const pd = calc.generateBotFormattedMessage('agentsmith', { referenceDate: date });
  console.log(`\n--- ${format(date, 'MMMM d, yyyy')} (Period ${pd.periodNumber}) ---`);
  console.log(`Good Morning Team,

A Quick Reminder: The ${pd.periodOrdinal} pay-period is fast approaching!

Please begin to input Kimai data today (${pd.endDateLong}) end of day. Please note that this paycheck will account for the full 2 weeks. This ${pd.periodOrdinal} payroll period will include the dates from ${pd.startDate} – ${pd.endDate}. (Meaning that today (${pd.endDateLong}) is also counted for the ${pd.periodOrdinal} pay-period, TOMORROW (${pd.tomorrowDate}) is counted for the ${pd.nextPeriodOrdinal} pay-period.)

For those of you that have been given extra hours, please ensure to input them into Kimai for this pay-period as well.

Please expect the payment to go through on the ${pd.paymentDate}.

If you have any questions or concerns, please do not hesitate to reach out to me.

Thank you.`);
});