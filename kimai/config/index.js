const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

/**
 * Centralized configuration management
 * All configuration in one place for easy updates
 */
const config = {
  // Kimai API settings
  kimai: {
    baseUrl: process.env.KIMAI_URL || 'https://kimai.starthub.academy',
    apiKey: process.env.KIMAI_API_KEY,
    username: process.env.KIMAI_USERNAME,
    password: process.env.KIMAI_PASSWORD,
    timeout: parseInt(process.env.KIMAI_TIMEOUT || '30000')
  },

  // Pay period settings
  payPeriod: {
    startDate: process.env.PAY_PERIOD_START || '2024-01-01',
    periodDays: parseInt(process.env.PAY_PERIOD_DAYS || '14')
  },

  // Storage settings
  storage: {
    type: process.env.STORAGE_TYPE || 'file', // 'file' or 'git'
    basePath: process.env.STORAGE_PATH || path.join(__dirname, '../../kimai-data'),
    git: {
      autoCommit: process.env.GIT_AUTO_COMMIT !== 'false',
      autoPush: process.env.GIT_AUTO_PUSH === 'true',
      remote: process.env.GIT_REMOTE || 'origin',
      branch: process.env.GIT_BRANCH || 'main'
    }
  },

  // Extraction settings
  extraction: {
    extractAfterDays: parseInt(process.env.EXTRACT_AFTER_DAYS || '7'),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.RETRY_DELAY || '5000')
  },

  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.join(__dirname, '../../logs/kimai.log')
  },

  // Feature flags
  features: {
    autoExtract: process.env.AUTO_EXTRACT !== 'false',
    notifications: process.env.ENABLE_NOTIFICATIONS === 'true',
    webDashboard: process.env.ENABLE_DASHBOARD === 'true'
  }
};

/**
 * Validate configuration
 * @throws {Error} if configuration is invalid
 */
function validateConfig() {
  // Skip validation in test mode
  if (process.env.NODE_ENV === 'test' || process.env.KIMAI_MOCK === 'true') {
    return true;
  }
  
  // Check Kimai auth
  if (!config.kimai.apiKey && (!config.kimai.username || !config.kimai.password)) {
    throw new Error('Kimai authentication not configured. Set KIMAI_API_KEY or KIMAI_USERNAME/PASSWORD');
  }

  // Validate pay period
  const startDate = new Date(config.payPeriod.startDate);
  if (isNaN(startDate.getTime())) {
    throw new Error('Invalid PAY_PERIOD_START date');
  }

  if (config.payPeriod.periodDays < 1) {
    throw new Error('PAY_PERIOD_DAYS must be at least 1');
  }

  return true;
}

/**
 * Get configuration with validation
 */
function getConfig() {
  validateConfig();
  return config;
}

/**
 * Override configuration (useful for testing)
 * @param {Object} overrides 
 */
function overrideConfig(overrides) {
  Object.assign(config, overrides);
}

module.exports = {
  getConfig,
  validateConfig,
  overrideConfig,
  config // Direct access if needed
};