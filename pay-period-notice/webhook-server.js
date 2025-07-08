#!/usr/bin/env node

/**
 * Webhook server for Pay Period Notice bot
 * This server receives webhooks from cron-job.org and sends Pumble notifications
 * only on actual pay period end days
 */

const express = require('express');
const PayPeriodWebhookHandler = require('./webhook-handler');

// Initialize webhook handler
const handler = new PayPeriodWebhookHandler({
  requireAuth: true,
  authToken: process.env.CRON_WEBHOOK_TOKEN || 'your-secret-token-here'
});

// Create Express app
const app = handler.createExpressApp();

// Add root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Pay Period Notice Webhook',
    status: 'running',
    endpoints: {
      webhook: '/webhook',
      health: '/health',
      preview: '/preview/:channel'
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Pay Period Notice webhook server running on port ${PORT}`);
  console.log(`   Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Preview: http://localhost:${PORT}/preview/dev`);
  console.log('');
  console.log('🔐 Security: Webhook requires X-Cron-Token header');
  console.log(`   Token: ${process.env.CRON_WEBHOOK_TOKEN || 'Set CRON_WEBHOOK_TOKEN env var'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});