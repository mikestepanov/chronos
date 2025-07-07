const axios = require('axios');

/**
 * CronJobManager - A powerful, all-in-one class for managing cron jobs with cron-job.org
 * 
 * Usage:
 *   const cronManager = new CronJobManager('your-api-key');
 *   await cronManager.createCronJob({ ... });
 *   await cronManager.listCronJobs();
 *   await cronManager.updateCronJob(jobId, { ... });
 *   await cronManager.deleteCronJob(jobId);
 */
class CronJobManager {
  constructor(apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('API key is required for CronJobManager');
    }

    this.apiKey = apiKey;
    this.baseURL = options.baseURL || 'https://api.cron-job.org';
    this.timeout = options.timeout || 30000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;

    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Add request/response interceptors for logging and error handling
    this._setupInterceptors();
  }

  /**
   * Create a new cron job
   * @param {Object} jobConfig - The cron job configuration
   * @param {string} jobConfig.job - The job name/title
   * @param {string} jobConfig.url - The URL to call
   * @param {string} jobConfig.schedule - Cron expression (e.g., "0 9 * * 1")
   * @param {boolean} [jobConfig.enabled=true] - Whether the job is enabled
   * @param {string} [jobConfig.timezone='UTC'] - Timezone for the cron job
   * @param {number} [jobConfig.timeout=30] - Request timeout in seconds
   * @param {string} [jobConfig.method='GET'] - HTTP method
   * @param {Object} [jobConfig.headers] - Custom headers
   * @param {string} [jobConfig.body] - Request body for POST/PUT
   * @param {Object} [jobConfig.auth] - Authentication config
   * @param {Object} [jobConfig.notification] - Notification settings
   * @returns {Promise<Object>} The created cron job
   */
  async createCronJob(jobConfig) {
    this._validateJobConfig(jobConfig);

    const payload = {
      job: {
        title: jobConfig.job,
        url: jobConfig.url,
        enabled: jobConfig.enabled !== false,
        saveResponses: jobConfig.saveResponses || true,
        schedule: {
          timezone: jobConfig.timezone || 'UTC',
          mdays: [],
          wdays: [],
          months: [],
          hours: [],
          minutes: []
        },
        requestTimeout: jobConfig.timeout || 30,
        redirectSuccess: true,
        requestMethod: jobConfig.method || 'GET'
      }
    };

    // Parse cron expression into schedule object
    this._parseCronExpression(jobConfig.schedule, payload.job.schedule);

    // Add optional fields
    if (jobConfig.headers) {
      payload.job.httpHeaders = this._formatHeaders(jobConfig.headers);
    }

    if (jobConfig.body) {
      payload.job.body = jobConfig.body;
    }

    if (jobConfig.auth) {
      payload.job.auth = {
        enable: true,
        user: jobConfig.auth.username,
        password: jobConfig.auth.password
      };
    }

    if (jobConfig.notification) {
      payload.job.notification = this._formatNotification(jobConfig.notification);
    }

    try {
      const response = await this._makeRequest('PUT', '/jobs', payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create cron job: ${error.message}`);
    }
  }

  /**
   * List all cron jobs
   * @param {Object} [options] - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=50] - Items per page
   * @returns {Promise<Array>} Array of cron jobs
   */
  async listCronJobs(options = {}) {
    const params = {
      page: options.page || 1,
      limit: options.limit || 50
    };

    try {
      const response = await this._makeRequest('GET', '/jobs', null, params);
      return response.data.jobs || [];
    } catch (error) {
      throw new Error(`Failed to list cron jobs: ${error.message}`);
    }
  }

  /**
   * Get a specific cron job by ID
   * @param {string|number} jobId - The job ID
   * @returns {Promise<Object>} The cron job details
   */
  async getCronJob(jobId) {
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    try {
      const response = await this._makeRequest('GET', `/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get cron job ${jobId}: ${error.message}`);
    }
  }

  /**
   * Update an existing cron job
   * @param {string|number} jobId - The job ID
   * @param {Object} updates - The fields to update
   * @returns {Promise<Object>} The updated cron job
   */
  async updateCronJob(jobId, updates) {
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    // Get existing job first
    const existingJob = await this.getCronJob(jobId);
    
    // Merge updates with existing data
    const payload = {
      job: {
        ...existingJob.job,
        ...this._prepareUpdatePayload(updates)
      }
    };

    try {
      const response = await this._makeRequest('PATCH', `/jobs/${jobId}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update cron job ${jobId}: ${error.message}`);
    }
  }

  /**
   * Delete a cron job
   * @param {string|number} jobId - The job ID
   * @returns {Promise<boolean>} True if successfully deleted
   */
  async deleteCronJob(jobId) {
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    try {
      await this._makeRequest('DELETE', `/jobs/${jobId}`);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete cron job ${jobId}: ${error.message}`);
    }
  }

  /**
   * Enable a cron job
   * @param {string|number} jobId - The job ID
   * @returns {Promise<Object>} The updated cron job
   */
  async enableCronJob(jobId) {
    return this.updateCronJob(jobId, { enabled: true });
  }

  /**
   * Disable a cron job
   * @param {string|number} jobId - The job ID
   * @returns {Promise<Object>} The updated cron job
   */
  async disableCronJob(jobId) {
    return this.updateCronJob(jobId, { enabled: false });
  }

  /**
   * Get job execution history
   * @param {string|number} jobId - The job ID
   * @param {Object} [options] - Query options
   * @returns {Promise<Array>} Array of execution history
   */
  async getJobHistory(jobId, options = {}) {
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    const params = {
      page: options.page || 1,
      limit: options.limit || 50
    };

    try {
      const response = await this._makeRequest('GET', `/jobs/${jobId}/history`, null, params);
      return response.data.history || [];
    } catch (error) {
      throw new Error(`Failed to get job history for ${jobId}: ${error.message}`);
    }
  }

  /**
   * Test a cron job (trigger it manually)
   * @param {string|number} jobId - The job ID
   * @returns {Promise<Object>} The test execution result
   */
  async testCronJob(jobId) {
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    try {
      const response = await this._makeRequest('POST', `/jobs/${jobId}/test`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to test cron job ${jobId}: ${error.message}`);
    }
  }

  /**
   * Get account information and limits
   * @returns {Promise<Object>} Account info
   */
  async getAccountInfo() {
    try {
      const response = await this._makeRequest('GET', '/account');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  // Private helper methods

  _setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        if (this.debug) {
          console.log(`[CronJobManager] ${config.method.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        if (this.debug) {
          console.log(`[CronJobManager] Response: ${response.status}`);
        }
        return response;
      },
      async (error) => {
        if (error.response) {
          const { status, data } = error.response;
          
          if (status === 401) {
            throw new Error('Invalid API key or unauthorized access');
          } else if (status === 404) {
            throw new Error('Resource not found');
          } else if (status === 429) {
            throw new Error('Rate limit exceeded. Please try again later');
          } else if (status >= 500) {
            throw new Error(`Server error: ${data.message || 'Internal server error'}`);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  async _makeRequest(method, endpoint, data = null, params = null) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const config = {
          method,
          url: endpoint,
          params
        };

        if (data) {
          config.data = data;
        }

        const response = await this.client(config);
        return response;
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.response && error.response.status < 500) {
          throw error;
        }

        // Wait before retrying
        if (attempt < this.retryAttempts) {
          await this._sleep(this.retryDelay * attempt);
        }
      }
    }

    throw lastError;
  }

  _validateJobConfig(config) {
    const required = ['job', 'url', 'schedule'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate URL
    try {
      new URL(config.url);
    } catch (error) {
      throw new Error('Invalid URL provided');
    }

    // Validate cron expression
    if (!this._isValidCronExpression(config.schedule)) {
      throw new Error('Invalid cron expression');
    }
  }

  _isValidCronExpression(expression) {
    // Basic validation for cron expression
    const parts = expression.split(' ');
    if (parts.length !== 5) {
      return false;
    }

    // TODO: Add more sophisticated cron validation
    return true;
  }

  _parseCronExpression(expression, schedule) {
    const parts = expression.split(' ');
    const [minutes, hours, days, months, weekdays] = parts;

    // Parse minutes
    if (minutes !== '*') {
      schedule.minutes = this._parseField(minutes, 0, 59);
    }

    // Parse hours
    if (hours !== '*') {
      schedule.hours = this._parseField(hours, 0, 23);
    }

    // Parse days
    if (days !== '*') {
      schedule.mdays = this._parseField(days, 1, 31);
    }

    // Parse months
    if (months !== '*') {
      schedule.months = this._parseField(months, 1, 12);
    }

    // Parse weekdays
    if (weekdays !== '*') {
      schedule.wdays = this._parseField(weekdays, 0, 7);
    }
  }

  _parseField(field, min, max) {
    const values = [];
    
    // Handle ranges (e.g., 1-5)
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(Number);
      for (let i = start; i <= end && i <= max; i++) {
        if (i >= min) values.push(i);
      }
    }
    // Handle lists (e.g., 1,3,5)
    else if (field.includes(',')) {
      field.split(',').forEach(val => {
        const num = Number(val);
        if (num >= min && num <= max) values.push(num);
      });
    }
    // Handle steps (e.g., */5)
    else if (field.includes('/')) {
      const [range, step] = field.split('/');
      const stepNum = Number(step);
      const start = range === '*' ? min : Number(range);
      
      for (let i = start; i <= max; i += stepNum) {
        if (i >= min) values.push(i);
      }
    }
    // Single value
    else {
      const num = Number(field);
      if (num >= min && num <= max) values.push(num);
    }
    
    return values;
  }

  _formatHeaders(headers) {
    // Convert headers object to array format expected by API
    return Object.entries(headers).map(([key, value]) => ({
      key,
      value
    }));
  }

  _formatNotification(notification) {
    return {
      onSuccess: notification.onSuccess || false,
      onFailure: notification.onFailure || true,
      onDisable: notification.onDisable || false
    };
  }

  _prepareUpdatePayload(updates) {
    const payload = {};

    // Map simple fields
    const simpleFields = ['title', 'url', 'enabled', 'requestTimeout', 'requestMethod'];
    simpleFields.forEach(field => {
      if (updates[field] !== undefined) {
        payload[field] = updates[field];
      }
    });

    // Handle schedule update
    if (updates.schedule) {
      payload.schedule = {};
      this._parseCronExpression(updates.schedule, payload.schedule);
    }

    // Handle other complex fields
    if (updates.headers) {
      payload.httpHeaders = this._formatHeaders(updates.headers);
    }

    if (updates.notification) {
      payload.notification = this._formatNotification(updates.notification);
    }

    return payload;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enable debug mode
   */
  enableDebug() {
    this.debug = true;
  }

  /**
   * Disable debug mode
   */
  disableDebug() {
    this.debug = false;
  }
}

module.exports = CronJobManager;