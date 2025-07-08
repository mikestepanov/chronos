const express = require('express');
const cron = require('node-cron');
const BiweeklyReminderService = require('../kimai/services/BiweeklyReminderService');
const FollowupReminderService = require('../kimai/services/FollowupReminderService');

const app = express();
const port = process.env.PORT || 3000;

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'chronos-cronjobs',
    uptime: process.uptime()
  });
});

// Manual triggers
app.post('/trigger/:type', async (req, res) => {
  try {
    switch (req.params.type) {
      case 'biweekly-advance':
        const biweekly = new BiweeklyReminderService();
        await biweekly.run('advance');
        res.json({ success: true, message: 'Biweekly advance notice sent' });
        break;
        
      case 'biweekly-reminder':
        const biweekly2 = new BiweeklyReminderService();
        await biweekly2.run('reminder');
        res.json({ success: true, message: 'Biweekly reminders sent' });
        break;
        
      case 'followup':
        const followup = new FollowupReminderService();
        await followup.run();
        res.json({ success: true, message: 'Follow-up check completed' });
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
  // Biweekly - Monday 7 AM CST (1 PM UTC)
  cron.schedule('0 13 * * 1', async () => {
    console.log('[CRON] Running biweekly advance notice');
    try {
      const service = new BiweeklyReminderService();
      await service.run('advance');
    } catch (error) {
      console.error('[CRON] Biweekly advance error:', error);
    }
  });

  // Biweekly - Monday 8:30 AM CST (2:30 PM UTC)
  cron.schedule('30 14 * * 1', async () => {
    console.log('[CRON] Running biweekly reminders');
    try {
      const service = new BiweeklyReminderService();
      await service.run('reminder');
    } catch (error) {
      console.error('[CRON] Biweekly reminder error:', error);
    }
  });

  // Follow-up - Daily 3 PM CST (9 PM UTC)
  cron.schedule('0 21 * * *', async () => {
    console.log('[CRON] Running follow-up check');
    try {
      const service = new FollowupReminderService();
      await service.run();
    } catch (error) {
      console.error('[CRON] Follow-up error:', error);
    }
  });

  console.log('✅ Cron jobs scheduled');
}

// Start server
app.listen(port, () => {
  console.log(`🚀 Cron server running on port ${port}`);
  setupCronJobs();
});