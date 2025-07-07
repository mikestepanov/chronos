// Vercel serverless function for pay period reminders
const KimaiTimesheetBot = require('../kimai-timesheet-bot');

module.exports = async (req, res) => {
  // Verify webhook secret if provided
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret && req.headers['x-webhook-secret'] !== webhookSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const bot = new KimaiTimesheetBot();
    await bot.sendPayPeriodReminder();
    
    res.status(200).json({ 
      success: true, 
      message: 'Pay period reminder sent',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ 
      error: 'Failed to send reminder',
      message: error.message 
    });
  }
};