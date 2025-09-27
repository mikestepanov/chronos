#!/usr/bin/env node

/**
 * Setup script for Pay Period Notice bot using cron-job.org
 * Creates cron jobs that run every Monday and check if it's pay period end
 */

const { CronJobManager } = require('../cron-job-org');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const { format } = require('date-fns');
const fs = require('fs');
const path = require('path');

class PayPeriodNoticeSetup {
  constructor() {
    this.payPeriodCalc = new PayPeriodCalculator({
      basePeriodNumber: 18,
      basePeriodEndDate: new Date('2025-06-23T12:00:00'),
      periodLengthDays: 14,
      paymentDelayDays: 7
    });
  }

  /**
   * Show current status and next steps
   */
  showStatus() {
    console.log('📊 Pay Period Notice Bot - Cron Setup\n');
    
    const status = this.payPeriodCalc.getCurrentPeriodInfo();
    const isLastDay = this.payPeriodCalc.isLastDayOfPeriod();
    console.log('Current Pay Period Information:');
    console.log(`  Period ${status.currentPeriod.number}: ${format(status.currentPeriod.startDate, 'MMM d')} - ${format(status.currentPeriod.endDate, 'MMM d')}`);
    console.log(`  Payment Date: ${format(status.currentPeriod.paymentDate, 'MMM d, yyyy')}`);
    console.log(`  Days until period end: ${this.payPeriodCalc.getDaysUntilPeriodEnd()}`);
    console.log(`  Is last day: ${isLastDay ? 'YES - Reminders will be sent!' : 'No'}`);
    console.log('');
  }

  /**
   * Direct approach - Send notifications directly from cron-job.org
   */
  async setupDirectCronJobs() {
    console.log('🎯 Bi-Weekly Direct Integration\n');
    
    if (!process.env.CRON_JOB_ORG_API_KEY) {
      console.log('❌ Missing CRON_JOB_ORG_API_KEY environment variable');
      console.log('   Get your API key from: https://console.cron-job.org/api');
      return false;
    }
    
    console.log('This approach uses cron-job.org\'s scheduling:');
    console.log('  ✅ No webhook server needed');
    console.log('  ✅ Runs every 2 weeks on Monday');
    console.log('  ✅ Sends directly to Pumble webhooks');
    console.log('  ✅ Properly synced with pay periods');
    console.log('');
    
    const cronManager = new CronJobManager(process.env.CRON_JOB_ORG_API_KEY);
    const periodInfo = this.payPeriodCalc.getCurrentPeriodInfo();
    
    try {
      // Generate the reminder messages
      const bot = new (require('./PayPeriodNoticeBot'))();
      const previews = bot.previewMessages(['dev', 'design']);
      
      // Calculate next pay period end to sync the schedule
      const nextPeriodEnd = this._getNextPayPeriodEndMonday();
      console.log(`Next pay period ends: ${format(nextPeriodEnd, 'MMM d, yyyy')}`);
      console.log('');
      
      // Create advance notice job
      console.log('Creating bi-weekly advance notice job (7 AM CST)...');
      const advanceJob = await cronManager.createCronJob({
        job: 'Pay Period Advance Notice - Bi-Weekly',
        url: process.env.PUMBLE_GENERAL_WEBHOOK_URL || process.env.PUMBLE_WEBHOOK_URL,
        schedule: {
          type: 'crontab',
          crontab: '0 13 * * 1' // Mondays at 1 PM UTC (7 AM CST)
        },
        scheduleInterval: 14, // Every 14 days
        scheduleStart: format(nextPeriodEnd, 'yyyy-MM-dd 13:00:00'), // Start on next period end
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(previews.advanceNotice),
        notification: {
          onFailure: true,
          onSuccess: false
        },
        timezone: 'UTC'
      });
      console.log('✅ Created bi-weekly advance notice job:', advanceJob.jobId);
      
      // Create main reminder jobs for each channel
      const channels = ['dev', 'design'];
      for (const channel of channels) {
        const webhookUrl = process.env[`PUMBLE_${channel.toUpperCase()}_WEBHOOK_URL`];
        if (!webhookUrl) {
          console.log(`⚠️  Skipping ${channel} - no webhook URL configured`);
          continue;
        }
        
        console.log(`Creating bi-weekly ${channel} team reminder job...`);
        const channelJob = await cronManager.createCronJob({
          job: `Pay Period Reminder - ${channel} team (Bi-Weekly)`,
          url: webhookUrl,
          schedule: {
            type: 'crontab',
            crontab: '30 14 * * 1' // Mondays at 2:30 PM UTC (8:30 AM CST)
          },
          scheduleInterval: 14, // Every 14 days
          scheduleStart: format(nextPeriodEnd, 'yyyy-MM-dd 14:30:00'), // Start on next period end
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(previews.mainReminders[channel]),
          notification: {
            onFailure: true,
            onSuccess: false
          },
          timezone: 'UTC'
        });
        console.log(`✅ Created bi-weekly ${channel} reminder job:`, channelJob.jobId);
      }
      
      console.log('\n✅ Success! Jobs are configured to run every 2 weeks');
      console.log('   Starting from:', format(nextPeriodEnd, 'MMMM d, yyyy'));
      console.log('   Then every 14 days after that (bi-weekly)');
      
      return true;
    } catch (error) {
      console.error('❌ Error creating cron jobs:', error.message);
      return false;
    }
  }

  /**
   * Webhook approach - More intelligent, only sends on pay period ends
   */
  async setupWebhookCronJobs() {
    console.log('🕐 Webhook Approach (Smart Pay Period Detection)\n');
    
    if (!process.env.CRON_JOB_ORG_API_KEY) {
      console.log('❌ Missing CRON_JOB_ORG_API_KEY environment variable');
      console.log('   Get your API key from: https://console.cron-job.org/api');
      return false;
    }
    
    console.log('This approach is smarter because:');
    console.log('  ✅ Only sends on actual pay period end days');
    console.log('  ✅ Can check dates and skip non-relevant Mondays');
    console.log('  ✅ More control over the logic');
    console.log('  ⚠️  Requires a webhook endpoint (we\'ll create one)');
    console.log('');
    
    const cronManager = new CronJobManager(process.env.CRON_JOB_ORG_API_KEY);
    
    try {
      // Create advance notice job
      console.log('Creating advance notice job (7 AM CST)...');
      const advanceJob = await cronManager.createCronJob({
        job: 'Pay Period Advance Notice',
        url: process.env.PAY_PERIOD_WEBHOOK_URL || 'https://your-webhook.com/pay-period-notice',
        schedule: '0 13 * * 1', // 1 PM UTC = 7 AM CST (during DST)
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cron-Token': process.env.CRON_WEBHOOK_TOKEN || 'your-secret-token'
        },
        body: JSON.stringify({
          action: 'advance-notice',
          channels: ['general']
        }),
        notification: {
          onFailure: true,
          onSuccess: false
        }
      });
      console.log('✅ Created:', advanceJob.jobId);
      
      // Create main reminder job
      console.log('Creating main reminder job (8:30 AM CST)...');
      const mainJob = await cronManager.createCronJob({
        job: 'Pay Period Main Reminders',
        url: process.env.PAY_PERIOD_WEBHOOK_URL || 'https://your-webhook.com/pay-period-notice',
        schedule: '30 14 * * 1', // 2:30 PM UTC = 8:30 AM CST (during DST)
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cron-Token': process.env.CRON_WEBHOOK_TOKEN || 'your-secret-token'
        },
        body: JSON.stringify({
          action: 'main-reminders',
          channels: ['dev', 'design']
        }),
        notification: {
          onFailure: true,
          onSuccess: false
        }
      });
      console.log('✅ Created:', mainJob.jobId);
      
      console.log('\n📌 Next Steps:');
      console.log('1. Deploy the webhook server (see webhook-server.js)');
      console.log('2. Update the webhook URLs in your cron jobs');
      console.log('3. The webhook will check if it\'s pay period end before sending');
      
      return true;
    } catch (error) {
      console.error('❌ Error creating cron jobs:', error.message);
      return false;
    }
  }

  /**
   * List existing pay period jobs
   */
  async listExistingJobs() {
    if (!process.env.CRON_JOB_ORG_API_KEY) {
      console.log('❌ Missing CRON_JOB_ORG_API_KEY');
      return;
    }
    
    const cronManager = new CronJobManager(process.env.CRON_JOB_ORG_API_KEY);
    console.log('\n📋 Existing Pay Period Jobs:\n');
    
    try {
      const jobs = await cronManager.listCronJobs({ limit: 100 });
      const payPeriodJobs = jobs.filter(job => 
        job.title.toLowerCase().includes('pay period') || 
        job.title.toLowerCase().includes('monday')
      );
      
      if (payPeriodJobs.length === 0) {
        console.log('No pay period jobs found.');
      } else {
        payPeriodJobs.forEach(job => {
          console.log(`[${job.jobId}] ${job.title}`);
          console.log(`  Status: ${job.enabled ? '✅ Enabled' : '❌ Disabled'}`);
          console.log(`  Schedule: ${job.schedule || 'Custom'}`);
          console.log(`  URL: ${job.url}`);
          console.log(`  Next run: ${job.nextExecution || 'N/A'}`);
          console.log('');
        });
      }
    } catch (error) {
      console.error('Error listing jobs:', error.message);
    }
  }

  /**
   * Show environment variables needed
   */
  showEnvVars() {
    console.log('\n🔐 Required Environment Variables:\n');
    
    console.log('Essential (add to .env):');
    console.log('  CRON_JOB_ORG_API_KEY        # Your cron-job.org API key');
    console.log('  PUMBLE_WEBHOOK_URL          # Main Pumble webhook');
    console.log('  PUMBLE_DEV_WEBHOOK_URL      # Dev team channel');
    console.log('  PUMBLE_DESIGN_WEBHOOK_URL   # Design team channel');
    console.log('  PUMBLE_GENERAL_WEBHOOK_URL  # General/advance notice channel');
    console.log('');
    
    console.log('For webhook approach (if using):');
    console.log('  PAY_PERIOD_WEBHOOK_URL      # Your server webhook endpoint');
    console.log('  CRON_WEBHOOK_TOKEN          # Secret token for webhook auth');
    console.log('');
    
    console.log('Example .env file:');
    console.log('  CRON_JOB_ORG_API_KEY=your-api-key-here');
    console.log('  PUMBLE_DEV_WEBHOOK_URL=https://hooks.pumble.com/xxxxxx');
    console.log('  PUMBLE_DESIGN_WEBHOOK_URL=https://hooks.pumble.com/yyyyyy');
    console.log('  PUMBLE_GENERAL_WEBHOOK_URL=https://hooks.pumble.com/zzzzzz');
  }
}

// CLI interface
if (require.main === module) {
  const setup = new PayPeriodNoticeSetup();
  const command = process.argv[2];
  
  setup.showStatus();
  
  switch (command) {
    case 'direct':
      setup.setupDirectCronJobs().then(success => {
        if (success) {
          setup.showEnvVars();
        }
      });
      break;
      
    case 'webhook':
      setup.setupWebhookCronJobs().then(success => {
        if (success) {
          const serverPath = path.join(__dirname, 'webhook-server.js');
          console.log('\n📄 Use the webhook server at:');
          console.log(`   ${serverPath}`);
          setup.showEnvVars();
        }
      });
      break;
      
    case 'list':
      setup.listExistingJobs();
      break;
      
    case 'env':
      setup.showEnvVars();
      break;
      
    default:
      console.log('📋 Setup Options:\n');
      console.log('1. Direct Pumble Integration (Simple but sends every Monday):');
      console.log('   node setup.js direct');
      console.log('');
      console.log('2. Webhook Approach (Smart - only sends on pay period ends):');
      console.log('   node setup.js webhook');
      console.log('');
      console.log('3. List existing cron jobs:');
      console.log('   node setup.js list');
      console.log('');
      console.log('4. Show required environment variables:');
      console.log('   node setup.js env');
      console.log('');
      console.log('💡 Recommendation: Use "direct" for simplicity if sending every Monday is OK.');
      console.log('   Use "webhook" if you only want to send on actual pay period ends.');
  }
}

module.exports = PayPeriodNoticeSetup;