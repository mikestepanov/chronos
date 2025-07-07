#!/usr/bin/env node

const axios = require('axios');
const { format } = require('date-fns');
const PayPeriodCalculator = require('../shared/pay-period-calculator');

async function sendActualReminder() {
  const apiKey = process.env.AGENTSMITH_API_KEY || '5d2c8b9e37f37d98f60ae4c94a311dd5';
  const dmChannelId = process.env.BOT_TO_MIKHAIL_DM_CHANNEL_ID || '686860a2851f413511ab90f8';
  const serviceUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
  
  // Initialize pay period calculator to generate the actual message
  const payPeriodCalc = new PayPeriodCalculator({
    basePeriodNumber: 18,
    basePeriodEndDate: new Date('2025-06-23T12:00:00'),
    periodLengthDays: 14,
    paymentDelayDays: 7
  });
  
  // Generate the actual reminder message for today
  const messageData = payPeriodCalc.generateBotFormattedMessage('agentsmith', {
    referenceDate: new Date(),
    includeExtraHours: true
  });
  
  const fullMessage = `📋 **This is the actual Monday reminder that goes to #dev and #design:**

---

${messageData.text}`;

  try {
    console.log('📨 Sending the actual Monday reminder message to you...\n');
    
    const response = await axios.post(`${serviceUrl}/sendMessage`, {
      channelId: dmChannelId,
      text: fullMessage
    }, {
      headers: { 'Api-Key': apiKey }
    });
    
    console.log('✅ Sent! This is the exact message that gets posted to:');
    console.log('- #dev channel at 7 AM CST');
    console.log('- #design channel at 7 AM CST');
    console.log('\nThe advance notice you received earlier alerts you 1 hour before these go out.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

sendActualReminder();