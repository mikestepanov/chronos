// Vercel serverless function for timesheet checking
const KimaiTimesheetBot = require('../kimai-timesheet-bot');

module.exports = async (req, res) => {
  // Verify webhook secret if provided
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret && req.headers['x-webhook-secret'] !== webhookSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const bot = new KimaiTimesheetBot();
    await bot.checkTimesheets();
    
    res.status(200).json({ 
      success: true, 
      message: 'Timesheet check completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking timesheets:', error);
    res.status(500).json({ 
      error: 'Failed to check timesheets',
      message: error.message 
    });
  }
};