const CronJobManager = require('../CronJobManager');

/**
 * CronBulkManager - Utility for managing multiple cron jobs at once
 */
class CronBulkManager extends CronJobManager {
  constructor(apiKey, options = {}) {
    super(apiKey, options);
  }

  /**
   * Create multiple cron jobs from an array
   * @param {Array<Object>} jobConfigs - Array of job configurations
   * @returns {Promise<Array>} Array of results { success: boolean, job?: Object, error?: string }
   */
  async createMultipleJobs(jobConfigs) {
    const results = [];
    
    for (const config of jobConfigs) {
      try {
        const job = await this.createCronJob(config);
        results.push({ success: true, job, config });
      } catch (error) {
        results.push({ success: false, error: error.message, config });
      }
    }
    
    return results;
  }

  /**
   * Delete multiple cron jobs
   * @param {Array<string|number>} jobIds - Array of job IDs to delete
   * @returns {Promise<Array>} Array of results
   */
  async deleteMultipleJobs(jobIds) {
    const results = [];
    
    for (const jobId of jobIds) {
      try {
        await this.deleteCronJob(jobId);
        results.push({ success: true, jobId });
      } catch (error) {
        results.push({ success: false, jobId, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Enable/disable multiple jobs at once
   * @param {Array<string|number>} jobIds - Array of job IDs
   * @param {boolean} enabled - Whether to enable or disable
   * @returns {Promise<Array>} Array of results
   */
  async setMultipleJobsStatus(jobIds, enabled) {
    const results = [];
    
    for (const jobId of jobIds) {
      try {
        const job = enabled 
          ? await this.enableCronJob(jobId)
          : await this.disableCronJob(jobId);
        results.push({ success: true, jobId, job });
      } catch (error) {
        results.push({ success: false, jobId, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Find jobs by pattern in title
   * @param {string} pattern - Pattern to search for
   * @returns {Promise<Array>} Array of matching jobs
   */
  async findJobsByPattern(pattern) {
    const allJobs = await this.listCronJobs({ limit: 100 });
    const regex = new RegExp(pattern, 'i');
    
    return allJobs.filter(job => regex.test(job.title));
  }

  /**
   * Clone a job with modifications
   * @param {string|number} sourceJobId - ID of job to clone
   * @param {Object} modifications - Changes to apply to the clone
   * @returns {Promise<Object>} The new job
   */
  async cloneJob(sourceJobId, modifications = {}) {
    const sourceJob = await this.getCronJob(sourceJobId);
    
    const newJobConfig = {
      ...sourceJob.job,
      ...modifications,
      job: modifications.job || `${sourceJob.job.title} (Clone)`
    };
    
    // Remove ID fields
    delete newJobConfig.jobId;
    delete newJobConfig.id;
    delete newJobConfig.created;
    delete newJobConfig.modified;
    
    return await this.createCronJob(newJobConfig);
  }

  /**
   * Backup all jobs to JSON
   * @returns {Promise<Object>} Backup object with jobs and metadata
   */
  async backupAllJobs() {
    const jobs = await this.listCronJobs({ limit: 1000 });
    
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      jobCount: jobs.length,
      jobs: jobs.map(job => ({
        ...job,
        _originalId: job.jobId
      }))
    };
  }

  /**
   * Restore jobs from backup
   * @param {Object} backup - Backup object from backupAllJobs()
   * @param {Object} options - Restore options
   * @returns {Promise<Object>} Restore results
   */
  async restoreFromBackup(backup, options = {}) {
    const { skipExisting = true, prefix = '' } = options;
    const results = {
      total: backup.jobs.length,
      restored: 0,
      skipped: 0,
      failed: 0,
      details: []
    };
    
    const existingJobs = skipExisting ? await this.listCronJobs({ limit: 1000 }) : [];
    const existingTitles = new Set(existingJobs.map(j => j.title));
    
    for (const jobData of backup.jobs) {
      const title = prefix + jobData.title;
      
      if (skipExisting && existingTitles.has(title)) {
        results.skipped++;
        results.details.push({
          originalId: jobData._originalId,
          title,
          status: 'skipped',
          reason: 'Already exists'
        });
        continue;
      }
      
      try {
        const newJob = await this.createCronJob({
          ...jobData,
          job: title
        });
        
        results.restored++;
        results.details.push({
          originalId: jobData._originalId,
          title,
          status: 'restored',
          newId: newJob.jobId
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          originalId: jobData._originalId,
          title,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Get statistics about all jobs
   * @returns {Promise<Object>} Statistics object
   */
  async getJobsStatistics() {
    const jobs = await this.listCronJobs({ limit: 1000 });
    
    const stats = {
      total: jobs.length,
      enabled: 0,
      disabled: 0,
      byScheduleType: {},
      byUrl: {},
      byMethod: {},
      nextExecutions: []
    };
    
    for (const job of jobs) {
      if (job.enabled) {
        stats.enabled++;
      } else {
        stats.disabled++;
      }
      
      // Count by HTTP method
      const method = job.requestMethod || 'GET';
      stats.byMethod[method] = (stats.byMethod[method] || 0) + 1;
      
      // Count by domain
      try {
        const url = new URL(job.url);
        const domain = url.hostname;
        stats.byUrl[domain] = (stats.byUrl[domain] || 0) + 1;
      } catch (e) {
        stats.byUrl['invalid'] = (stats.byUrl['invalid'] || 0) + 1;
      }
    }
    
    return stats;
  }

  /**
   * Test multiple jobs and get results
   * @param {Array<string|number>} jobIds - Array of job IDs to test
   * @returns {Promise<Array>} Test results
   */
  async testMultipleJobs(jobIds) {
    const results = [];
    
    for (const jobId of jobIds) {
      try {
        const testResult = await this.testCronJob(jobId);
        results.push({
          jobId,
          success: true,
          result: testResult
        });
      } catch (error) {
        results.push({
          jobId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = CronBulkManager;