require('dotenv').config();
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
    keepAlive: {
      schedule: '*/5 * * * *',
      description: 'Keep-alive ping every 5 minutes (prevents sleeping)'
    },
    dailyReminder: { 
      schedule: '0 22 * * *', 
      description: 'Daily reminder at 5 PM CST to bot-testing channel' 
    },
    mondayReminder: { 
      schedule: '0 19 * * 1', 
      description: 'Monday 2 PM CST reminder to dev & design (pay period end only)' 
    }
  };

  res.json({
    service: 'Chronos Cron Server',
    activeJobs: Object.keys(jobDetails).map(key => ({
      name: key,
      ...jobDetails[key],
      active: !!activeJobs[key]
    }))
  });
});

// Keep-alive ping - runs every 5 minutes to prevent sleeping
console.log('💓 Enabling keep-alive ping (every 5 minutes)');

activeJobs.keepAlive = cron.schedule('*/5 * * * *', async () => {
  console.log('💓 Keep-alive ping at', new Date().toISOString());
  try {
    // Just a simple self-ping to keep the app awake
    const http = require('http');
    http.get('http://localhost:3000/health', (res) => {
      console.log('💓 Keep-alive response:', res.statusCode);
    }).on('error', (err) => {
      console.error('💓 Keep-alive error:', err.message);
    });
  } catch (error) {
    console.error('❌ Keep-alive failed:', error.message);
  }
});

// REMOVED: 5-minute test reminder - use manual triggers for testing

// Daily reminder - runs daily at 5 PM CST to bot-testing channel  
console.log('🔄 Enabling daily reminder (5 PM CST to bot-testing)');

// 5 PM CST = 10 PM UTC (during DST) or 11 PM UTC (standard time)
activeJobs.dailyReminder = cron.schedule('0 22 * * *', async () => {
  console.log('⏰ Running daily reminder at', new Date().toISOString());
  try {
    execSync('node scripts/send-timesheet-reminder.js -c bot-testing', { 
      cwd: __dirname,
      stdio: 'inherit' 
    });
  } catch (error) {
    console.error('❌ Daily reminder failed:', error.message);
  }
});

// Monday reminder - runs every Monday at 2 PM CST to dev & design
console.log('📅 Enabling Monday reminder (2 PM CST on pay period end)');

// Import PayPeriodCalculator to check if today is last day
const PayPeriodCalculator = require('./shared/pay-period-calculator');
const calculator = new PayPeriodCalculator();

// 2 PM CST = 7 PM UTC (during DST) or 8 PM UTC (standard time)
activeJobs.mondayReminder = cron.schedule('0 19 * * 1', async () => {
  // Check if today is the last day of a pay period
  const currentPeriod = calculator.getCurrentPayPeriod();
  const today = new Date();
  const periodEndDate = new Date(currentPeriod.end);
  
  // Check if today is the same date as period end
  if (today.toDateString() === periodEndDate.toDateString()) {
    console.log(`⏰ Running Monday reminder for period ${currentPeriod.number} end at`, new Date().toISOString());
    
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
  } else {
    console.log(`⏭️ Skipping Monday reminder (not end of pay period)`);
  }
});

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
  console.log('\nConfigured cron jobs:');
  console.log(`💓 Keep-alive (5min): ✅ ENABLED`);
  console.log(`📅 Daily reminder (5pm CST): ✅ ENABLED`);
  console.log(`📅 Monday reminder (2pm CST): ✅ ENABLED`);
  console.log('\nManual triggers available at:');
  console.log('  POST /trigger/test');
  console.log('  POST /trigger/monday');
});