/**
 * Koyeb Deployment Configuration
 * Centralized config for all Koyeb deployments
 */

module.exports = {
  // App configuration
  app: {
    name: process.env.KOYEB_APP_NAME || 'chronos-bot',
    port: process.env.PORT || 3000
  },

  // Service configuration
  service: {
    type: 'WEB',
    instanceType: 'free',
    regions: ['was'], // Washington DC
    scaling: {
      min: 1,
      max: 1  // No auto-scaling on free tier
    }
  },

  // Build configuration
  build: {
    buildCommand: 'npm install',
    runCommand: 'node koyeb-cron-server.js',
    healthCheckPath: '/health',
    healthCheckInterval: 60
  },

  // Git configuration
  git: {
    repository: process.env.KOYEB_GIT_REPO || null,
    branch: process.env.KOYEB_GIT_BRANCH || 'main',
    autoDeploy: true
  },

  // Environment mapping
  envMapping: {
    // Kimai
    'KIMAI_USERNAME': process.env.KIMAI_USERNAME,
    'KIMAI_PASSWORD': process.env.KIMAI_PASSWORD,
    
    // Pumble
    'PUMBLE_API_KEY': process.env.PUMBLE_API_KEY,
    
    // Cron settings
    'ENABLE_TEST_CRON': 'true', // Enable 5-minute test cron
    'ENABLE_MONDAY_REMINDER': 'false', // Disable for testing
    
    // Webhook security
    'WEBHOOK_SECRET': process.env.WEBHOOK_SECRET || 'test-secret-123',
    
    // App settings
    'NODE_ENV': 'production'
  }
};