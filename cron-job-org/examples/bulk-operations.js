const CronBulkManager = require('../utils/CronBulkManager');
const CronValidator = require('../utils/CronValidator');

async function bulkExamples() {
  const bulkManager = new CronBulkManager(process.env.CRON_JOB_ORG_API_KEY);

  console.log('🚀 Bulk Operations Examples\n');

  // Example 1: Validate cron expressions before creating jobs
  console.log('1️⃣ Validating cron expressions...');
  const expressions = [
    '0 9 * * 1',      // Valid: Every Monday at 9 AM
    '*/15 * * * *',   // Valid: Every 15 minutes
    'invalid cron',   // Invalid
    '0 25 * * *'      // Invalid: Hour out of range
  ];

  expressions.forEach(expr => {
    const result = CronValidator.validate(expr);
    if (result.valid) {
      console.log(`✅ "${expr}" - ${result.explanation}`);
    } else {
      console.log(`❌ "${expr}" - ${result.error}`);
    }
  });
  console.log('');

  // Example 2: Use common cron patterns
  console.log('2️⃣ Common cron patterns...');
  console.log('Every Monday at 9 AM:', CronValidator.common.mondayMorning(9, 0));
  console.log('Business days at 5 PM:', CronValidator.common.businessDays(17, 0));
  console.log('Every 30 minutes:', CronValidator.common.everyNMinutes(30));
  console.log('Twice daily (9 AM & 5 PM):', CronValidator.common.twiceDaily([9, 17]));
  console.log('');

  // Example 3: Create multiple jobs at once
  console.log('3️⃣ Creating multiple jobs...');
  const jobConfigs = [
    {
      job: 'Daily Standup Reminder',
      url: 'https://your-app.com/api/standup-reminder',
      schedule: CronValidator.common.businessDays(9, 30)
    },
    {
      job: 'Weekly Report',
      url: 'https://your-app.com/api/weekly-report',
      schedule: CronValidator.common.everyWeek(5, 16, 0) // Friday 4 PM
    },
    {
      job: 'Monthly Backup',
      url: 'https://your-app.com/api/backup',
      schedule: CronValidator.common.everyMonth(1, 2, 0) // 1st of month at 2 AM
    }
  ];

  const createResults = await bulkManager.createMultipleJobs(jobConfigs);
  createResults.forEach(result => {
    if (result.success) {
      console.log(`✅ Created: ${result.config.job} (ID: ${result.job.jobId})`);
    } else {
      console.log(`❌ Failed: ${result.config.job} - ${result.error}`);
    }
  });
  console.log('');

  // Example 4: Find jobs by pattern
  console.log('4️⃣ Finding jobs by pattern...');
  const reminderJobs = await bulkManager.findJobsByPattern('reminder');
  console.log(`Found ${reminderJobs.length} reminder jobs:`);
  reminderJobs.forEach(job => {
    console.log(`  - ${job.title} (${job.enabled ? 'enabled' : 'disabled'})`);
  });
  console.log('');

  // Example 5: Clone a job
  if (reminderJobs.length > 0) {
    console.log('5️⃣ Cloning a job...');
    const cloned = await bulkManager.cloneJob(reminderJobs[0].jobId, {
      job: 'Cloned Reminder',
      schedule: '0 10 * * 1' // Change to 10 AM
    });
    console.log(`✅ Cloned job created with ID: ${cloned.jobId}`);
    console.log('');
  }

  // Example 6: Backup all jobs
  console.log('6️⃣ Backing up all jobs...');
  const backup = await bulkManager.backupAllJobs();
  console.log(`📦 Backed up ${backup.jobCount} jobs`);
  console.log(`Backup created at: ${backup.exportedAt}`);
  
  // Save to file (example)
  // require('fs').writeFileSync('cron-backup.json', JSON.stringify(backup, null, 2));
  console.log('');

  // Example 7: Get statistics
  console.log('7️⃣ Getting job statistics...');
  const stats = await bulkManager.getJobsStatistics();
  console.log('📊 Job Statistics:');
  console.log(`  Total jobs: ${stats.total}`);
  console.log(`  Enabled: ${stats.enabled}`);
  console.log(`  Disabled: ${stats.disabled}`);
  console.log(`  By method:`, stats.byMethod);
  console.log(`  By domain:`, Object.entries(stats.byUrl).slice(0, 5));
  console.log('');

  // Example 8: Bulk enable/disable
  console.log('8️⃣ Bulk disable/enable operations...');
  const jobIds = reminderJobs.slice(0, 3).map(j => j.jobId);
  
  console.log('Disabling jobs...');
  const disableResults = await bulkManager.setMultipleJobsStatus(jobIds, false);
  console.log(`Disabled ${disableResults.filter(r => r.success).length} jobs`);
  
  console.log('Re-enabling jobs...');
  const enableResults = await bulkManager.setMultipleJobsStatus(jobIds, true);
  console.log(`Enabled ${enableResults.filter(r => r.success).length} jobs`);
  console.log('');

  // Example 9: Test multiple jobs
  console.log('9️⃣ Testing multiple jobs...');
  const testResults = await bulkManager.testMultipleJobs(jobIds.slice(0, 2));
  testResults.forEach(result => {
    if (result.success) {
      console.log(`✅ Job ${result.jobId} test completed`);
    } else {
      console.log(`❌ Job ${result.jobId} test failed: ${result.error}`);
    }
  });
  console.log('');

  // Example 10: Cleanup (commented out)
  /*
  console.log('🔟 Cleaning up test jobs...');
  const testJobIds = createResults
    .filter(r => r.success)
    .map(r => r.job.jobId);
  
  const deleteResults = await bulkManager.deleteMultipleJobs(testJobIds);
  console.log(`Deleted ${deleteResults.filter(r => r.success).length} test jobs`);
  */
}

// Run examples
if (require.main === module) {
  bulkExamples().catch(console.error);
}

module.exports = { bulkExamples };