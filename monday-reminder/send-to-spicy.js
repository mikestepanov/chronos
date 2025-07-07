#!/usr/bin/env node

const PumbleClient = require('../shared/pumble-client');

async function sendToSpicy() {
  const client = new PumbleClient({
    apiKey: process.env.PUMBLE_API_KEY || '5d2c8b9e37f37d98f60ae4c94a311dd5',
    baseUrl: 'https://pumble.com/api/v1'
  });

  const message = `Good Morning Team,

A Quick Reminder: The 19th pay-period is fast approaching!

Please begin to input Kimai data today (July 7th) end of day. Please note that this paycheck will account for the full 2 weeks. This 19th payroll period will include the dates from 6/24 – 7/7. (Meaning that today (July 7th) is also counted for the 19th pay-period, TOMORROW (July 8th) is counted for the 20th pay-period.)

For those of you that have been given extra hours, please ensure to input them into Kimai for this pay-period as well.

Please expect the payment to go through on the July 14th.

If you have any questions or concerns, please do not hesitate to reach out to Mikhail.

Thank you.

@here`;

  try {
    console.log('Sending message to SPICY channel...');
    await client.sendMessage('675e6f8cfef1b9289bd46888', message, false);
    console.log('✅ Message sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send message:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
  }
}

sendToSpicy();