#!/usr/bin/env node

// This script sets up a REAL cron job that runs at 8 AM tomorrow
// It will send the EXACT same messages as the GitHub Actions cron

const { exec } = require('child_process');
const { format, addDays } = require('date-fns');
const path = require('path');

const OMEGA_PATH = '/home/mstepanov/Documents/GitHub/omega';
const TOMORROW = format(addDays(new Date(), 1), 'yyyy-MM-dd');

// Create the cron commands
const ADVANCE_CMD = `cd ${OMEGA_PATH} && /usr/bin/node bots/monday-reminder/monday-reminder.js advance >> /tmp/monday-reminder-${TOMORROW}.log 2>&1`;
const MAIN_CMD = `cd ${OMEGA_PATH} && /usr/bin/node bots/monday-reminder/monday-reminder.js send >> /tmp/monday-reminder-${TOMORROW}.log 2>&1`;

// Add cron jobs
const cronCommands = [
  `# Monday Reminder Test for ${TOMORROW} - Auto-removes after running`,
  `0 7 * * * ${ADVANCE_CMD} && (crontab -l | grep -v "monday-reminder.*${TOMORROW}" | crontab -)`,
  `0 8 * * * ${MAIN_CMD} && (crontab -l | grep -v "monday-reminder.*${TOMORROW}" | crontab -)`
];

// Install the cron jobs
exec('crontab -l 2>/dev/null', (err, stdout) => {
  const existingCron = stdout || '';
  const newCron = existingCron + '\n' + cronCommands.join('\n') + '\n';
  
  exec(`echo "${newCron}" | crontab -`, (err) => {
    if (err) {
      console.error('❌ Failed to set up cron:', err);
      return;
    }
    
    console.log('✅ Cron jobs set up successfully!');
    console.log('\n📅 Schedule for tomorrow:');
    console.log('   7:00 AM - Advance notice to your DM');
    console.log('   8:00 AM - Main reminders to channels');
    console.log('\nThese will run ONCE and then auto-remove.');
    console.log(`\nLogs will be at: /tmp/monday-reminder-${TOMORROW}.log`);
    console.log('\nTo check: crontab -l | grep monday-reminder');
    console.log('To remove: crontab -e');
  });
});