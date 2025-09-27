#!/usr/bin/env node

require('dotenv').config();
const PumbleClient = require('../shared/pumble-client');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const { format } = require('date-fns');
const channels = require('../config/channels.json');
const readline = require('readline');

// Load channel ID from config
const BOT_TESTING_CHANNEL_ID = channels.pumble.bot_testing.id;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function sendToTestChannel() {
  const apiKey = process.env.PUMBLE_API_KEY || process.env.AGENTSMITH_API_KEY;

  if (!apiKey) {
    throw new Error('PUMBLE_API_KEY not found in environment');
  }

  // Initialize PumbleClient
  const pumbleClient = new PumbleClient({
    apiKey: apiKey
  });

  // Generate pay period reminder message
  const calculator = new PayPeriodCalculator();
  const message = calculator.generateReminderMessage({
    referenceDate: new Date(),
    includeExtraHours: true,
    teamName: 'Team'
  });

  console.log('\n📤 Sending message to bot testing channel...\n');

  try {
    await pumbleClient.sendMessage(BOT_TESTING_CHANNEL_ID, message, false);
    console.log('✅ Sent to bot testing channel');
  } catch (error) {
    console.error('❌ Failed to send:', error.message);
  }
}

function parseTimeInput(input) {
  // Handle various formats: "11:45", "11:45 AM", "11:45 PM", "2345", etc.
  const cleaned = input.trim().toUpperCase();

  // Match HH:MM AM/PM format
  const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1]);
    const minute = parseInt(ampmMatch[2]);
    const period = ampmMatch[3];

    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;

    return { hour, minute };
  }

  // Match HH:MM 24-hour format
  const twentyFourMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    const hour = parseInt(twentyFourMatch[1]);
    const minute = parseInt(twentyFourMatch[2]);
    return { hour, minute };
  }

  // Match HHMM format
  const compactMatch = cleaned.match(/^(\d{3,4})$/);
  if (compactMatch) {
    const timeStr = compactMatch[1].padStart(4, '0');
    const hour = parseInt(timeStr.substring(0, 2));
    const minute = parseInt(timeStr.substring(2, 4));
    return { hour, minute };
  }

  return null;
}

async function waitUntilSpecifiedTime() {
  console.log('⏰ Test Channel Message Scheduler\n');
  console.log('Examples: 11:45 AM, 23:45, 1145, 2:30 PM\n');

  const timeInput = await askQuestion('What time should I send the message? ');

  const parsedTime = parseTimeInput(timeInput);
  if (!parsedTime) {
    console.log('❌ Invalid time format. Please try again.');
    rl.close();
    return;
  }

  const { hour, minute } = parsedTime;

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    console.log('❌ Invalid time values. Hour must be 0-23, minute must be 0-59.');
    rl.close();
    return;
  }

  console.log(`\n⏰ Waiting until ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} to send reminder...\n`);

  rl.close();

  const checkTime = () => {
    const now = new Date();
    const currentTime = format(now, 'HH:mm:ss');
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    console.log(`⏱️  Current time: ${currentTime} - Waiting for ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00...`);

    // Check if it's the target time
    if (currentHour === hour && currentMinute === minute) {
      console.log(`\n🎯 It's ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}! Time to send reminder!\n`);
      clearInterval(interval);
      sendToTestChannel().then(() => {
        console.log('\n✅ All done!');
        process.exit(0);
      }).catch(error => {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
      });
    }
  };

  // Check immediately
  checkTime();

  // Then check every 30 seconds
  const interval = setInterval(checkTime, 30000);

  console.log('📌 Press Ctrl+C to cancel\n');
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n❌ Cancelled by user');
  rl.close();
  process.exit(0);
});

// Run
waitUntilSpecifiedTime();