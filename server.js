const express = require('express');
const cron = require('node-cron');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'chronos-bot',
    version: '2.0.0',
    uptime: process.uptime()
  });
});

// Manual triggers
app.post('/trigger/:type', async (req, res) => {
  try {
    switch (req.params.type) {
      case 'biweekly-advance':
        await execAsync('node cronjobs/biweekly-reminder.js advance');
        res.json({ success: true, message: 'Biweekly advance notice triggered' });
        break;
        
      case 'biweekly-reminder':
        await execAsync('node cronjobs/biweekly-reminder.js reminder');
        res.json({ success: true, message: 'Biweekly reminders triggered' });
        break;
        
      case 'followup':
        await execAsync('node cronjobs/followup-reminder.js');
        res.json({ success: true, message: 'Follow-up check triggered' });
        break;
        
      default:
        res.status(400).json({ error: 'Unknown trigger type' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedule cron jobs
function setupCronJobs() {
  // Load channel configuration
  const channelsPath = path.join(__dirname, 'config/channels.json');
  const channelsData = fs.readFileSync(channelsPath, 'utf8');
  const channels = JSON.parse(channelsData).pumble;
  
  // Production channel IDs
  const prodChannels = `${channels.dev.id},${channels.design.id}`;
  // Test channel ID
  const testChannel = channels.bot_testing.id;
  // Test run - Monday 6 AM CST (12 PM UTC)
  cron.schedule('0 12 * * 1', async () => {
    console.log('[CRON] Running biweekly advance notice - TEST');
    try {
      await execAsync(`node cronjobs/biweekly-reminder.js advance ${testChannel}`);
    } catch (error) {
      console.error('[CRON] Biweekly advance test error:', error);
    }
  });
  
  // Production - Monday 7 AM CST (1 PM UTC)
  cron.schedule('0 13 * * 1', async () => {
    console.log('[CRON] Running biweekly advance notice - PRODUCTION');
    try {
      await execAsync(`node cronjobs/biweekly-reminder.js advance ${prodChannels}`);
    } catch (error) {
      console.error('[CRON] Biweekly advance error:', error);
    }
  });

  // Test run - Monday 7:30 AM CST (1:30 PM UTC)
  cron.schedule('30 13 * * 1', async () => {
    console.log('[CRON] Running biweekly reminders - TEST');
    try {
      await execAsync(`node cronjobs/biweekly-reminder.js reminder ${testChannel}`);
    } catch (error) {
      console.error('[CRON] Biweekly reminder test error:', error);
    }
  });
  
  // Production - Monday 8:30 AM CST (2:30 PM UTC)
  cron.schedule('30 14 * * 1', async () => {
    console.log('[CRON] Running biweekly reminders - PRODUCTION');
    try {
      await execAsync(`node cronjobs/biweekly-reminder.js reminder ${prodChannels}`);
    } catch (error) {
      console.error('[CRON] Biweekly reminder error:', error);
    }
  });

  // Follow-up - Daily 3 PM CST (9 PM UTC)
  cron.schedule('0 21 * * *', async () => {
    console.log('[CRON] Running follow-up check');
    try {
      await execAsync('node cronjobs/followup-reminder.js');
    } catch (error) {
      console.error('[CRON] Follow-up error:', error);
    }
  });

  console.log('✅ Cron jobs scheduled');
  console.log('   • Biweekly Test: Mondays 6 AM & 7:30 AM CST (to bot-testing)');
  console.log('   • Biweekly Prod: Mondays 7 AM & 8:30 AM CST (to dev & design)');
  console.log('   • Follow-up: Daily 3 PM CST');
}

// Start server
app.listen(port, () => {
  console.log(`🚀 Chronos server running on port ${port}`);
  console.log(`   Health: http://localhost:${port}/health`);
  console.log(`   Triggers: POST /trigger/{biweekly-advance|biweekly-reminder|followup}`);
  setupCronJobs();
});