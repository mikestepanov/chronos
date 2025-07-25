const express = require('express');
const cron = require('node-cron');
const { execSync } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Track active cron jobs
const activeJobs = {};

// Health check endpoint for Koyeb
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    cronJobs: Object.keys(activeJobs).reduce((acc, key) => {
      acc[key] = activeJobs[key] ? 'running' : 'stopped';
      return acc;
    }, {}),
    timestamp: new Date().toISOString() 
  });
});

// Status endpoint with job details
app.get('/', (req, res) => {
  const jobDetails = {
    testReminder: { 
      schedule: '*/10 * * * *', 
      description: 'Test reminder to bot-testing channel every 10 minutes' 
    },
    mondayReminder: { 
      schedule: '0 14 * * 1', 
      description: 'Monday 9 AM CST reminder to dev & design channels' 
    }
  };

  res.json({
    service: 'Chronos Cron Server',
    environment: process.env.NODE_ENV || 'development',
    activeJobs: Object.keys(jobDetails).map(key => ({
      name: key,
      ...jobDetails[key],
      active: !!activeJobs[key]
    }))
  });
});

// Test reminder - runs every 10 minutes to bot-testing channel
if (process.env.ENABLE_TEST_REMINDER === 'true') {
  console.log('🔄 Enabling test reminder (every 10 minutes to bot-testing)');
  
  activeJobs.testReminder = cron.schedule('*/10 * * * *', async () => {
    console.log('⏰ Running test reminder at', new Date().toISOString());
    try {
      execSync('node scripts/send-timesheet-reminder.js -c bot-testing', { 
        cwd: __dirname,
        stdio: 'inherit' 
      });
    } catch (error) {
      console.error('❌ Test reminder failed:', error.message);
    }
  });
}

// Monday reminder - runs every Monday at 9 AM CST to dev & design
if (process.env.ENABLE_MONDAY_REMINDER === 'true') {
  console.log('📅 Enabling Monday reminder (9 AM CST to dev & design)');
  
  // 9 AM CST = 2 PM UTC (during DST) or 3 PM UTC (standard time)
  activeJobs.mondayReminder = cron.schedule('0 14 * * 1', async () => {
    console.log('⏰ Running Monday reminder at', new Date().toISOString());
    
    try {
      // Send to dev channel
      console.log('📤 Sending to dev channel...');
      execSync('node scripts/send-timesheet-reminder.js -c dev', { 
        cwd: __dirname,
        stdio: 'inherit' 
      });
      
      // Send to design channel
      console.log('📤 Sending to design channel...');
      execSync('node scripts/send-timesheet-reminder.js -c design', { 
        cwd: __dirname,
        stdio: 'inherit' 
      });
      
      console.log('✅ Monday reminders sent successfully');
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
        console.log('🔫 Manually triggering test reminder');
        execSync('node scripts/send-timesheet-reminder.js -c bot-testing', { 
          cwd: __dirname,
          stdio: 'inherit' 
        });
        res.json({ success: true, message: 'Test reminder sent to bot-testing' });
        break;
        
      case 'monday':
        console.log('🔫 Manually triggering Monday reminder');
        
        // Send to both channels
        execSync('node scripts/send-timesheet-reminder.js -c dev', { 
          cwd: __dirname,
          stdio: 'inherit' 
        });
        execSync('node scripts/send-timesheet-reminder.js -c design', { 
          cwd: __dirname,
          stdio: 'inherit' 
        });
        
        res.json({ 
          success: true, 
          message: 'Monday reminder sent to dev & design'
        });
        break;
        
      default:
        res.status(404).json({ error: 'Unknown job. Available: test, monday' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Chronos Cron Server running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('\nConfigured cron jobs:');
  console.log(`⏰ Test reminder (10min): ${process.env.ENABLE_TEST_REMINDER === 'true' ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`📅 Monday reminder: ${process.env.ENABLE_MONDAY_REMINDER === 'true' ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log('\nManual triggers available at:');
  console.log('  POST /trigger/test');
  console.log('  POST /trigger/monday');
});