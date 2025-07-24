const express = require('express');
const cron = require('node-cron');
const { execSync } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint for Koyeb
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    cronJobs: {
      testCron: testCronJob ? 'running' : 'stopped',
      mondayReminder: mondayReminderJob ? 'running' : 'stopped'
    },
    timestamp: new Date().toISOString() 
  });
});

// Status endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Chronos Cron Server',
    environment: process.env.NODE_ENV || 'development',
    activeJobs: [
      { name: 'test-cron', schedule: '*/5 * * * *', active: !!testCronJob },
      { name: 'monday-reminder', schedule: '0 7 * * 1', active: !!mondayReminderJob }
    ]
  });
});

// Test cron job - runs every 5 minutes
let testCronJob;
if (process.env.ENABLE_TEST_CRON === 'true') {
  console.log('🔄 Enabling test cron job (every 5 minutes)');
  testCronJob = cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ Running test cron job at', new Date().toISOString());
    try {
      execSync('node scripts/test-cron.js', { 
        cwd: __dirname,
        stdio: 'inherit' 
      });
    } catch (error) {
      console.error('❌ Test cron job failed:', error.message);
    }
  });
}

// Monday reminder cron job - runs every Monday at 7 AM CST
let mondayReminderJob;
if (process.env.ENABLE_MONDAY_REMINDER === 'true') {
  // 7 AM CST = 12 PM UTC (during DST) or 1 PM UTC (standard time)
  console.log('📅 Enabling Monday reminder cron job');
  mondayReminderJob = cron.schedule('0 12 * * 1', async () => {
    console.log('⏰ Running Monday reminder job at', new Date().toISOString());
    try {
      execSync('node monday-reminder/monday-reminder.js send', { 
        cwd: __dirname,
        stdio: 'inherit' 
      });
    } catch (error) {
      console.error('❌ Monday reminder job failed:', error.message);
    }
  });
}

// Manual trigger endpoints (protected by secret)
app.post('/trigger/:job', express.json(), (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { job } = req.params;
  
  try {
    switch(job) {
      case 'test':
        console.log('🔫 Manually triggering test cron');
        execSync('node scripts/test-cron.js', { 
          cwd: __dirname,
          stdio: 'inherit' 
        });
        res.json({ success: true, message: 'Test cron triggered' });
        break;
        
      case 'monday':
        console.log('🔫 Manually triggering Monday reminder');
        execSync('node monday-reminder/monday-reminder.js test', { 
          cwd: __dirname,
          stdio: 'inherit' 
        });
        res.json({ success: true, message: 'Monday reminder triggered' });
        break;
        
      default:
        res.status(404).json({ error: 'Unknown job' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Chronos Cron Server running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Test cron: ${process.env.ENABLE_TEST_CRON === 'true' ? 'ENABLED' : 'DISABLED'}`);
  console.log(`📅 Monday reminder: ${process.env.ENABLE_MONDAY_REMINDER === 'true' ? 'ENABLED' : 'DISABLED'}`);
});