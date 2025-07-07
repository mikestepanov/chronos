const PayPeriodCalculator = require('../shared/pay-period-calculator');
const { format, addDays } = require('date-fns');

const calc = new PayPeriodCalculator({
  basePeriodNumber: 18,
  basePeriodEndDate: new Date('2025-06-23T12:00:00'), // Monday at noon
  periodLengthDays: 14,
  paymentDelayDays: 7
});

console.log('=== PAY PERIOD SCHEDULE ===\n');
console.log('Base: Period 18 ends June 23, 2025 (Monday)\n');

// Show next 10 periods starting from period 18
let currentDate = new Date('2025-06-23T12:00:00');

for (let i = 0; i < 10; i++) {
  const info = calc.getCurrentPeriodInfo(currentDate);
  const p = info.currentPeriod;
  
  console.log(`Period ${p.number}:`);
  console.log(`  Dates: ${format(p.startDate, 'MMM d')} - ${format(p.endDate, 'MMM d, yyyy')} (${format(p.endDate, 'EEEE')})`);
  console.log(`  Payment: ${format(p.paymentDate, 'EEEE, MMM d')}`);
  
  // Monday reminder is sent when Monday is the last day (same day as period end)
  if (format(p.endDate, 'EEEE') === 'Monday') {
    console.log(`  📧 Monday reminder: ${format(p.endDate, 'MMM d')} at 7 AM CST (TODAY is last day)`);
  } else {
    console.log(`  ⚠️  Period doesn't end on Monday - check configuration`);
  }
  
  console.log('');
  
  // Move to first day of next period
  currentDate = info.nextPeriod.startDate;
}

// Test specific dates
console.log('\n=== SPECIFIC DATE TESTS ===\n');

const testDates = [
  new Date('2025-06-23T12:00:00'), // Period 18 end (Monday)
  new Date('2025-07-07T12:00:00'), // Period 19 end (Monday)
  new Date('2025-07-21T12:00:00'), // Period 20 end (Monday)
  new Date('2025-08-04T12:00:00'), // Period 21 end (Monday)
];

testDates.forEach(date => {
  const info = calc.getCurrentPeriodInfo(date);
  const isLastDay = calc.isLastDayOfPeriod(date);
  console.log(`${format(date, 'MMM d, yyyy')} (${format(date, 'EEEE')}):`);
  console.log(`  Period: ${info.currentPeriod.number}`);
  console.log(`  Is last day: ${isLastDay}`);
  console.log(`  Send reminder: ${isLastDay ? 'YES' : 'NO'}`);
  console.log('');
});