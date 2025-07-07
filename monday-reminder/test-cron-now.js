#!/usr/bin/env node

// This simulates EXACTLY what the GitHub Actions cron job does

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Simulating GitHub Actions cron job...\n');

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

console.log('=====================================');
console.log('STEP 1: 6 AM - ADVANCE NOTICE');
console.log('=====================================\n');

// Run advance notice (6 AM job)
const advance = spawn('node', ['monday-reminder.js', 'advance'], {
  cwd: __dirname,
  env: env,
  stdio: 'inherit'
});

advance.on('close', (code) => {
  if (code !== 0) {
    console.error(`\n❌ Advance notice failed with code ${code}`);
    process.exit(1);
  }
  
  console.log('\n=====================================');
  console.log('STEP 2: 7 AM - MAIN REMINDERS');
  console.log('=====================================\n');
  
  // Run main reminders (7 AM job)
  const main = spawn('node', ['monday-reminder.js', 'send'], {
    cwd: __dirname,
    env: env,
    stdio: 'inherit'
  });
  
  main.on('close', (code) => {
    if (code !== 0) {
      console.error(`\n❌ Main reminders failed with code ${code}`);
      process.exit(1);
    }
    
    console.log('\n✅ Cron simulation complete!');
    console.log('This is EXACTLY what happens on GitHub Actions every Monday.');
  });
});