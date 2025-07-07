const CronJobManager = require('../CronJobManager');

// Initialize the manager with your API key
const cronManager = new CronJobManager(process.env.CRON_JOB_ORG_API_KEY || 'your-api-key-here');

// Enable debug mode to see API calls
// cronManager.enableDebug();

async function examples() {
  try {
    console.log('🚀 CronJobManager Examples\n');

    // Example 1: Create a simple cron job
    console.log('1️⃣ Creating a simple cron job...');
    const simpleJob = await cronManager.createCronJob({
      job: 'Daily Report Generator',
      url: 'https://your-app.com/api/generate-report',
      schedule: '0 9 * * *', // Every day at 9 AM
      timezone: 'America/New_York'
    });
    console.log('✅ Created job:', simpleJob);
    console.log('');

    // Example 2: Create a Monday reminder job with custom headers
    console.log('2️⃣ Creating Monday reminder job with headers...');
    const mondayJob = await cronManager.createCronJob({
      job: 'Monday Team Reminder',
      url: 'https://your-app.com/api/send-reminder',
      schedule: '0 9 * * 1', // Every Monday at 9 AM
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your-webhook-key'
      },
      body: JSON.stringify({
        message: 'Weekly team reminder',
        channel: 'general'
      }),
      notification: {
        onFailure: true,
        onSuccess: false
      }
    });
    console.log('✅ Created Monday job:', mondayJob);
    console.log('');

    // Example 3: List all jobs
    console.log('3️⃣ Listing all cron jobs...');
    const jobs = await cronManager.listCronJobs();
    console.log(`📋 Found ${jobs.length} jobs:`);
    jobs.forEach(job => {
      console.log(`  - [${job.jobId}] ${job.title} (${job.enabled ? 'enabled' : 'disabled'})`);
    });
    console.log('');

    // Example 4: Get specific job details
    if (jobs.length > 0) {
      const jobId = jobs[0].jobId;
      console.log(`4️⃣ Getting details for job ${jobId}...`);
      const jobDetails = await cronManager.getCronJob(jobId);
      console.log('📄 Job details:', JSON.stringify(jobDetails, null, 2));
      console.log('');
    }

    // Example 5: Update a job
    if (jobs.length > 0) {
      const jobId = jobs[0].jobId;
      console.log(`5️⃣ Updating job ${jobId}...`);
      const updated = await cronManager.updateCronJob(jobId, {
        title: 'Updated Job Title',
        schedule: '0 10 * * *' // Change to 10 AM
      });
      console.log('✅ Updated job:', updated);
      console.log('');
    }

    // Example 6: Test a job (trigger manually)
    if (jobs.length > 0) {
      const jobId = jobs[0].jobId;
      console.log(`6️⃣ Testing job ${jobId}...`);
      const testResult = await cronManager.testCronJob(jobId);
      console.log('🧪 Test result:', testResult);
      console.log('');
    }

    // Example 7: Get job execution history
    if (jobs.length > 0) {
      const jobId = jobs[0].jobId;
      console.log(`7️⃣ Getting execution history for job ${jobId}...`);
      const history = await cronManager.getJobHistory(jobId, { limit: 5 });
      console.log(`📊 Last ${history.length} executions:`);
      history.forEach(exec => {
        console.log(`  - ${exec.date}: ${exec.status} (${exec.duration}ms)`);
      });
      console.log('');
    }

    // Example 8: Disable/Enable a job
    if (jobs.length > 0) {
      const jobId = jobs[0].jobId;
      console.log(`8️⃣ Disabling job ${jobId}...`);
      await cronManager.disableCronJob(jobId);
      console.log('✅ Job disabled');
      
      console.log(`   Re-enabling job ${jobId}...`);
      await cronManager.enableCronJob(jobId);
      console.log('✅ Job enabled');
      console.log('');
    }

    // Example 9: Get account information
    console.log('9️⃣ Getting account information...');
    const accountInfo = await cronManager.getAccountInfo();
    console.log('👤 Account info:', accountInfo);
    console.log('');

    // Example 10: Delete a job (commented out to avoid accidental deletion)
    /*
    if (jobs.length > 0) {
      const jobId = jobs[0].jobId;
      console.log(`🔟 Deleting job ${jobId}...`);
      const deleted = await cronManager.deleteCronJob(jobId);
      console.log('✅ Job deleted:', deleted);
    }
    */

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run examples
examples();