const CronJobManager = require('../CronJobManager');

/**
 * Example: Setting up Monday reminders using cron-job.org
 * This shows how to integrate CronJobManager with the existing Monday reminder system
 */

async function setupMondayReminders() {
  const cronManager = new CronJobManager(process.env.CRON_JOB_ORG_API_KEY);

  try {
    // 1. Create advance notice job (7 AM CST / 12 PM UTC)
    console.log('Setting up advance notice job...');
    const advanceNoticeJob = await cronManager.createCronJob({
      job: 'Monday Pay Period Advance Notice',
      url: 'https://api.github.com/repos/mikestepanov/chronos/actions/workflows/monday-reminder.yml/dispatches',
      schedule: '0 12 * * 1', // Every Monday at 12 PM UTC
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          action: 'advance-only'
        }
      }),
      notification: {
        onFailure: true,
        onSuccess: false
      }
    });
    console.log('✅ Advance notice job created:', advanceNoticeJob.jobId);

    // 2. Create main reminder job (8:30 AM CST / 1:30 PM UTC)
    console.log('\nSetting up main reminder job...');
    const mainReminderJob = await cronManager.createCronJob({
      job: 'Monday Pay Period Main Reminder',
      url: 'https://api.github.com/repos/mikestepanov/chronos/actions/workflows/monday-reminder.yml/dispatches',
      schedule: '30 13 * * 1', // Every Monday at 1:30 PM UTC
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          action: 'main-only'
        }
      }),
      notification: {
        onFailure: true,
        onSuccess: false
      }
    });
    console.log('✅ Main reminder job created:', mainReminderJob.jobId);

    // 3. Create a test cron job (daily at 8:15 AM CST)
    console.log('\nSetting up daily test job...');
    const testJob = await cronManager.createCronJob({
      job: 'Daily Test Cron',
      url: 'https://api.github.com/repos/mikestepanov/chronos/actions/workflows/test-cron.yml/dispatches',
      schedule: '15 13 * * *', // Every day at 1:15 PM UTC
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: 'main'
      }),
      notification: {
        onFailure: true,
        onSuccess: false
      }
    });
    console.log('✅ Test job created:', testJob.jobId);

    // 4. Alternative: Direct webhook to your server
    console.log('\nSetting up direct webhook example...');
    const directWebhookJob = await cronManager.createCronJob({
      job: 'Monday Direct Webhook',
      url: 'https://your-server.com/api/monday-reminder',
      schedule: '0 9 * * 1', // Every Monday at 9 AM
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Token': process.env.CRON_WEBHOOK_TOKEN
      },
      body: JSON.stringify({
        action: 'send-reminders',
        channels: ['dev', 'design'],
        test_mode: false
      }),
      auth: {
        username: 'cron-job',
        password: process.env.CRON_WEBHOOK_PASSWORD
      },
      notification: {
        onFailure: true,
        onSuccess: true
      },
      timeout: 60 // 60 seconds timeout
    });
    console.log('✅ Direct webhook job created:', directWebhookJob.jobId);

    // List all created jobs
    console.log('\n📋 All Monday reminder jobs:');
    const jobs = await cronManager.listCronJobs();
    const mondayJobs = jobs.filter(job => job.title.includes('Monday'));
    mondayJobs.forEach(job => {
      console.log(`  - [${job.jobId}] ${job.title}`);
    });

  } catch (error) {
    console.error('❌ Error setting up Monday reminders:', error.message);
  }
}

// Alternative: Using environment-specific configurations
async function setupEnvironmentSpecificJobs() {
  const cronManager = new CronJobManager(process.env.CRON_JOB_ORG_API_KEY);
  
  const environment = process.env.NODE_ENV || 'development';
  const configs = {
    development: {
      schedule: '*/5 * * * *', // Every 5 minutes for testing
      url: 'http://localhost:3000/api/test-reminder'
    },
    staging: {
      schedule: '0 */2 * * *', // Every 2 hours
      url: 'https://staging.your-app.com/api/reminder'
    },
    production: {
      schedule: '0 9 * * 1', // Every Monday at 9 AM
      url: 'https://api.your-app.com/api/reminder'
    }
  };

  const config = configs[environment];
  
  try {
    const job = await cronManager.createCronJob({
      job: `${environment} Monday Reminder`,
      url: config.url,
      schedule: config.schedule,
      method: 'POST',
      headers: {
        'X-Environment': environment
      }
    });
    
    console.log(`✅ Created ${environment} job:`, job.jobId);
  } catch (error) {
    console.error(`❌ Error creating ${environment} job:`, error.message);
  }
}

// Run the setup
if (require.main === module) {
  console.log('🚀 Setting up Monday reminder cron jobs...\n');
  setupMondayReminders();
  
  // Uncomment to run environment-specific setup
  // setupEnvironmentSpecificJobs();
}

module.exports = {
  setupMondayReminders,
  setupEnvironmentSpecificJobs
};