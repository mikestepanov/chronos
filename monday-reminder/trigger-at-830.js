#!/usr/bin/env node

const { spawn } = require('child_process');

// Calculate time until 8:30 AM CST
const now = new Date();
const target = new Date();
target.setHours(8, 30, 0, 0); // 8:30 AM local time (assuming system is in CST)

// If it's already past 8:30 AM today, set for tomorrow
if (now > target) {
  target.setDate(target.getDate() + 1);
}

const msUntilTarget = target - now;
const minutesUntil = Math.floor(msUntilTarget / 60000);
const secondsUntil = Math.floor((msUntilTarget % 60000) / 1000);

console.log(`⏰ Script will trigger at 8:30 AM CST`);
console.log(`📅 Target time: ${target.toLocaleString()}`);
console.log(`⏳ Waiting ${minutesUntil} minutes and ${secondsUntil} seconds...`);

// Set up environment like GitHub Actions does
const env = {
  ...process.env,
  BOT_IDENTITY: 'agentsmith',
  BOT_NAME: 'Agent Smith',
  MESSAGING_PLATFORM: 'pumble',
  PUMBLE_API_KEY: process.env.PUMBLE_API_KEY || '5d2c8b9e37f37d98f60ae4c94a311dd5',
  PUMBLE_BASE_URL: 'https://pumble.com/api/v1',
  MIKHAIL_PUMBLE_ID: '66908542f1798a06218c1fc5',
  BOT_TO_MIKHAIL_DM_CHANNEL_ID: '686860a2851f413511ab90f8',
  DEV_CHANNEL_ID: '66934de10aeebd36fe26f468',
  DESIGN_CHANNEL_ID: '66b6450b791a8769092d6f89',
  SPICY_CHANNEL_ID: '675e6f8cfef1b9289bd46888',
  KIMAI_URL: 'https://kimai.starthub.academy',
  KIMAI_API_KEY: 'dummy-key-for-reminder'
};

setTimeout(() => {
  console.log('\n🚀 IT\'S 8:30 AM! Triggering Monday reminder...\n');
  
  // Run main reminders
  const reminder = spawn('node', ['monday-reminder.js', 'send'], {
    cwd: __dirname,
    env: env,
    stdio: 'inherit'
  });
  
  reminder.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Monday reminder sent successfully!');
    } else {
      console.error(`\n❌ Monday reminder failed with code ${code}`);
      process.exit(1);
    }
  });
}, msUntilTarget);

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Script cancelled by user');
  process.exit(0);
});