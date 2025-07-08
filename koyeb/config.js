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
    runCommand: 'node server.js',
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
    'KIMAI_API_URL': process.env.KIMAI_API_URL,
    'KIMAI_API_KEY': process.env.KIMAI_API_KEY,
    
    // Pumble
    'PUMBLE_API_KEY': process.env.PUMBLE_API_KEY,
    'PUMBLE_BOT_ID': process.env.PUMBLE_BOT_ID,
    
    // App settings
    'NODE_ENV': 'production'
  }
};