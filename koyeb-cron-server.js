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
      schedule: '*/10 * * * *',
      description: 'Keep-alive message every 10 minutes (prevents sleeping)'
    },
    dailyReminder: {
      schedule: '37 4 * * *',
      description: 'Daily reminder at 11:37 PM CST to bot-testing channel'
    },
    dailyTrivia: {
      schedule: '0 15 * * *',
      description: 'Daily trivia at 10 AM CST to bot-testing channel'
    },
    mondayReminder: {
      schedule: '0 17 * * 1',
      description: 'Monday 12 PM CST reminder to dev & design (pay period end only)'
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

// Keep-alive message - sends a message every 10 minutes to prevent sleeping
console.log('💓 Enabling keep-alive message (every 10 minutes)');

activeJobs.keepAlive = cron.schedule('*/10 * * * *', async () => {
  const now = new Date();
  console.log('💓 Sending keep-alive message at', now.toISOString());
  try {
    // Send a keep-alive message to bot-testing channel
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Chicago'
    });
    execSync(`node scripts/send-message.js -c bot-testing -m "Keep-alive check: ${timeString} CST"`, { 
      cwd: __dirname,
      stdio: 'inherit' 
    });
    console.log('💓 Keep-alive message sent successfully');
  } catch (error) {
    console.error('❌ Keep-alive message failed:', error.message);
  }
});

// REMOVED: 5-minute test reminder - use manual triggers for testing

// Daily reminder - runs daily at 11:37 PM CST to bot-testing channel
console.log('🔄 Enabling daily reminder (11:37 PM CST to bot-testing)');

// 11:37 PM CST = 4:37 AM UTC (during DST) or 5:37 AM UTC (standard time)
activeJobs.dailyReminder = cron.schedule('37 4 * * *', async () => {
  console.log('⏰ Running daily reminder at', new Date().toISOString());
  try {
    // Send simple Koyeb check message
    execSync('node scripts/send-message.js -c bot-testing -m "Daily Message Koyeb check"', { 
      cwd: __dirname,
      stdio: 'inherit' 
    });
  } catch (error) {
    console.error('❌ Daily reminder failed:', error.message);
  }
});

// Daily trivia - runs daily at 10 AM CST to bot-testing channel
console.log('💡 Enabling daily trivia (10 AM CST to bot-testing)');

// 10 AM CST = 3 PM UTC (during DST) or 4 PM UTC (standard time)
activeJobs.dailyTrivia = cron.schedule('0 15 * * *', async () => {
  console.log('💡 Running daily trivia at', new Date().toISOString());
  try {
    execSync('node scripts/send-daily-trivia.js -c bot-testing', { 
      cwd: __dirname,
      stdio: 'inherit' 
    });
    console.log('✅ Daily trivia sent successfully');
  } catch (error) {
    console.error('❌ Daily trivia failed:', error.message);
  }
});

// Monday reminder - runs every Monday at 12 PM CST to dev & design
console.log('📅 Enabling Monday reminder (12 PM CST on pay period end)');

// Import PayPeriodCalculator to check if today is last day
const PayPeriodCalculator = require('./shared/pay-period-calculator');
const calculator = new PayPeriodCalculator();

// 12 PM CST = 5 PM UTC (during DST) or 6 PM UTC (standard time)
activeJobs.mondayReminder = cron.schedule('0 17 * * 1', async () => {
  console.log('⏰ Monday cron triggered at', new Date().toISOString());
  
  // Check if today is the last day of a pay period
  const currentPeriod = calculator.getCurrentPayPeriod();
  const today = new Date();
  const periodEndDate = new Date(currentPeriod.end);
  
  console.log('Checking conditions:', {
    today: today.toDateString(),
    periodEnd: periodEndDate.toDateString(),
    isMatch: today.toDateString() === periodEndDate.toDateString()
  });
  
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
  console.log(`💓 Keep-alive (10min): ✅ ENABLED`);
  console.log(`📅 Daily reminder (11:37pm CST): ✅ ENABLED`);
  console.log(`💁 Daily trivia (10am CST): ✅ ENABLED`);
  console.log(`📅 Monday reminder (12pm CST): ✅ ENABLED`);
  console.log('\nManual triggers available at:');
  console.log('  POST /trigger/test');
  console.log('  POST /trigger/monday');
});