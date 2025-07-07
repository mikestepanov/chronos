#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../shared/pumble-client');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const { format } = require('date-fns');

async function sendCorrectMondayTest() {
  const pumble = new PumbleClient({
    apiKey: process.env.AGENTSMITH_API_KEY,  
    botEmail: process.env.AGENTSMITH_EMAIL,
    botId: process.env.AGENTSMITH_ID
  });

  const channelId = process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID;
  
  // Initialize pay period calculator with correct base
  // Period 18 ended June 23, 2025 (12 days ago)
  // So we're now in period 19 which ends July 7, 2025
  const payPeriodCalc = new PayPeriodCalculator({
    basePeriodNumber: 18,
    basePeriodEndDate: new Date('2025-06-23T12:00:00'),
    periodLengthDays: 14,
    paymentDelayDays: 5 // Payment on Friday
  });
  
  // Get current period info
  const now = new Date('2025-07-07'); // Next Monday when period 19 ends
  const periodInfo = payPeriodCalc.getCurrentPeriodInfo(now);
  const periodData = payPeriodCalc.generateBotFormattedMessage('agentsmith', { referenceDate: now });
  
  console.log('Period Info:', {
    current: periodInfo.currentPeriod.number,
    start: format(periodInfo.currentPeriod.startDate, 'M/d/yyyy'),
    end: format(periodInfo.currentPeriod.endDate, 'M/d/yyyy'),
    payment: format(periodInfo.currentPeriod.paymentDate, 'M/d/yyyy')
  });
  
  // Create the correct message
  const message = `**Good Morning Mikhail,**

A Quick Reminder: The ${periodData.periodOrdinal} pay-period is fast approaching!

Please begin to input Kimai data today (${periodData.endDateLong}) end of day. Please note that this paycheck will account for the full 2 weeks. This ${periodData.periodOrdinal} payroll period will include the dates from ${periodData.startDate} – ${periodData.endDate}. (Meaning that today (${periodData.endDateLong}) is also counted for the ${periodData.periodOrdinal} pay-period, TOMORROW (${periodData.tomorrowDate}) is counted for the ${periodData.nextPeriodOrdinal} pay-period.)

For those of you that have been given extra hours, please ensure to input them into Kimai for this pay-period as well.

Please expect the payment to go through on the ${periodData.paymentDate}.

If you have any questions or concerns, please do not hesitate to reach out to Mikhail.

Thank you.

@here`;

  try {
    console.log('📨 Sending corrected Monday reminder...');
    const result = await pumble.sendMessage(channelId, message);
    console.log('✅ Message sent successfully!');
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

sendCorrectMondayTest();