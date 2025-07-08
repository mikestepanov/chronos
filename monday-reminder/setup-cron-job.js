#!/usr/bin/env node

/**
 * Setup bi-weekly Monday reminder cron job using cron-job.org
 * This runs every 2 weeks on Monday at 8 AM CST
 */

const { CronJobManager } = require('../cron-job-org');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const { format } = require('date-fns');

async function setupBiweeklyMondayReminder() {
  // Initialize the cron job manager
  const cronManager = new CronJobManager(process.env.CRON_JOB_ORG_API_KEY);
  
  // Initialize pay period calculator to understand the schedule
  const payPeriodCalc = new PayPeriodCalculator({
    basePeriodNumber: 18,
    basePeriodEndDate: new Date('2025-06-23T12:00:00'), // Monday
    periodLengthDays: 14,
    paymentDelayDays: 7
  });

  // Get current period info for context
  const periodInfo = payPeriodCalc.getCurrentPeriodInfo();
  console.log('📅 Current Period Information:');
  console.log(`  Period ${periodInfo.periodNumber}: ${format(periodInfo.startDate, 'MMM d')} - ${format(periodInfo.endDate, 'MMM d')}`);
  console.log(`  Payment Date: ${format(periodInfo.paymentDate, 'MMM d, yyyy')}`);
  console.log('');

  try {
    // Main reminder at 8:30 AM CST (1:30 PM UTC during DST, 2:30 PM UTC standard time)
    console.log('Setting up bi-weekly Monday reminder...');
    
    // For bi-weekly, we need to use a specific approach since cron doesn't natively support it
    // We'll create two jobs - one for even weeks and one for odd weeks
    const jobs = [];

    // Job 1: Advance notice at 7 AM CST (12 PM UTC during DST)
    const advanceJob = await cronManager.createCronJob({
      job: 'Bi-weekly Monday Pay Period Advance Notice',
      url: process.env.MONDAY_REMINDER_WEBHOOK_URL || 'https://your-webhook.com/monday-reminder',
      schedule: '0 12 * * 1', // Every Monday at 12 PM UTC
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Token': process.env.CRON_WEBHOOK_TOKEN || 'your-webhook-token'
      },
      body: JSON.stringify({
        action: 'advance-notice',
        type: 'biweekly',
        test_mode: false
      }),
      notification: {
        onFailure: true,
        onSuccess: false
      },
      timezone: 'UTC'
    });
    jobs.push(advanceJob);
    console.log('✅ Created advance notice job:', advanceJob.jobId);

    // Job 2: Main reminder at 8:30 AM CST (1:30 PM UTC during DST)
    const mainJob = await cronManager.createCronJob({
      job: 'Bi-weekly Monday Pay Period Main Reminder',
      url: process.env.MONDAY_REMINDER_WEBHOOK_URL || 'https://your-webhook.com/monday-reminder',
      schedule: '30 13 * * 1', // Every Monday at 1:30 PM UTC
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Token': process.env.CRON_WEBHOOK_TOKEN || 'your-webhook-token'
      },
      body: JSON.stringify({
        action: 'send-reminders',
        type: 'biweekly',
        channels: ['dev', 'design'],
        test_mode: false
      }),
      notification: {
        onFailure: true,
        onSuccess: false
      },
      timezone: 'UTC'
    });
    jobs.push(mainJob);
    console.log('✅ Created main reminder job:', mainJob.jobId);

    // Note about bi-weekly implementation
    console.log('\n⚠️  Important: Bi-weekly Schedule Implementation');
    console.log('Since cron-job.org runs these every Monday, your webhook handler should:');
    console.log('1. Check if the current week is a pay period end week');
    console.log('2. Only send reminders on the correct weeks (every 2nd Monday)');
    console.log('3. Use PayPeriodCalculator.isLastDayOfPeriod() to verify');
    
    // Alternative: Use GitHub Actions for precise bi-weekly control
    console.log('\n💡 Alternative Implementation:');
    console.log('For precise bi-weekly control, consider using GitHub Actions:');
    console.log('');
    console.log('Example GitHub Action trigger:');
    const githubJob = {
      job: 'GitHub Action Trigger - Bi-weekly Monday',
      url: 'https://api.github.com/repos/mikestepanov/chronos/actions/workflows/monday-reminder.yml/dispatches',
      schedule: '0 13 * * 1', // Every Monday
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          action: 'biweekly-check'
        }
      })
    };
    console.log(JSON.stringify(githubJob, null, 2));

    return jobs;

  } catch (error) {
    console.error('❌ Error setting up cron jobs:', error.message);
    throw error;
  }
}

// Add command to list/manage existing Monday reminder jobs
async function listMondayReminderJobs() {
  const cronManager = new CronJobManager(process.env.CRON_JOB_ORG_API_KEY);
  
  console.log('\n📋 Existing Monday Reminder Jobs:');
  const jobs = await cronManager.listCronJobs({ limit: 100 });
  const mondayJobs = jobs.filter(job => 
    job.title.toLowerCase().includes('monday') || 
    job.title.toLowerCase().includes('pay period')
  );
  
  if (mondayJobs.length === 0) {
    console.log('No Monday reminder jobs found.');
  } else {
    mondayJobs.forEach(job => {
      console.log(`\n[${job.jobId}] ${job.title}`);
      console.log(`  Status: ${job.enabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`  URL: ${job.url}`);
      console.log(`  Schedule: ${job.schedule || 'Custom'}`);
      console.log(`  Next run: ${job.nextExecution || 'N/A'}`);
    });
  }
  
  return mondayJobs;
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      console.log('🚀 Setting up bi-weekly Monday reminder cron jobs...\n');
      setupBiweeklyMondayReminder()
        .then(jobs => {
          console.log(`\n✅ Successfully created ${jobs.length} cron jobs!`);
        })
        .catch(error => {
          console.error('\n❌ Setup failed:', error.message);
          process.exit(1);
        });
      break;
      
    case 'list':
      listMondayReminderJobs()
        .catch(error => {
          console.error('❌ Error listing jobs:', error.message);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node setup-cron-job.js <command>');
      console.log('');
      console.log('Commands:');
      console.log('  setup  - Create bi-weekly Monday reminder cron jobs');
      console.log('  list   - List existing Monday reminder jobs');
      console.log('');
      console.log('Environment variables:');
      console.log('  CRON_JOB_ORG_API_KEY       - Your cron-job.org API key');
      console.log('  MONDAY_REMINDER_WEBHOOK_URL - Webhook URL for reminders');
      console.log('  CRON_WEBHOOK_TOKEN         - Authentication token for webhook');
      process.exit(0);
  }
}

module.exports = {
  setupBiweeklyMondayReminder,
  listMondayReminderJobs
};