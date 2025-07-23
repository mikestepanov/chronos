#!/usr/bin/env node

const MessagingFactory = require('./shared/messaging-factory');
const PayPeriodCalculator = require('./shared/pay-period-calculator');

async function sendPayPeriodDMToMikhail() {
  try {
    console.log('Sending pay period reminder DM to Mikhail...\n');
    
    // Initialize messaging with config
    const messaging = MessagingFactory.create('pumble', {
      apiKey: process.env.PUMBLE_API_KEY,
      botId: process.env.PUMBLE_BOT_ID || '686860a1851f413511ab90ef'
    });
    
    // Mikhail's Pumble ID (from environment or hardcoded)
    const mikhailId = process.env.MIKHAIL_PUMBLE_ID || '66908542f1798a06218c1fc5';
    
    // Generate pay period reminder message
    const calculator = new PayPeriodCalculator();
    const message = calculator.generateReminderMessage({
      referenceDate: new Date(),
      includeExtraHours: true,
      teamName: 'Team'
    });
    
    console.log('--- MESSAGE PREVIEW ---');
    console.log(message);
    console.log('--- END PREVIEW ---\n');
    
    // Send direct message using messaging factory
    await messaging.sendDirectMessage(mikhailId, message);
    
    console.log('✅ Pay period reminder DM sent successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('API Response:', error.response.data);
    }
  }
}

// Run
if (require.main === module) {
  sendPayPeriodDMToMikhail();
}