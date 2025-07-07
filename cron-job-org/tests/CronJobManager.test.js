const CronJobManager = require('../CronJobManager');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('CronJobManager', () => {
  let manager;
  let mockAxiosInstance;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup axios mock
    mockAxiosInstance = {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    
    axios.create.mockReturnValue(mockAxiosInstance);
    
    // Create manager instance
    manager = new CronJobManager('test-api-key');
  });

  describe('Constructor', () => {
    test('should throw error if API key is not provided', () => {
      expect(() => new CronJobManager()).toThrow('API key is required for CronJobManager');
    });

    test('should initialize with default options', () => {
      expect(manager.apiKey).toBe('test-api-key');
      expect(manager.baseURL).toBe('https://api.cron-job.org');
      expect(manager.timeout).toBe(30000);
      expect(manager.retryAttempts).toBe(3);
      expect(manager.retryDelay).toBe(1000);
    });

    test('should accept custom options', () => {
      const customManager = new CronJobManager('test-key', {
        baseURL: 'https://custom.api.com',
        timeout: 60000,
        retryAttempts: 5,
        retryDelay: 2000
      });

      expect(customManager.baseURL).toBe('https://custom.api.com');
      expect(customManager.timeout).toBe(60000);
      expect(customManager.retryAttempts).toBe(5);
      expect(customManager.retryDelay).toBe(2000);
    });
  });

  describe('createCronJob', () => {
    beforeEach(() => {
      // Mock the internal client
      manager.client = jest.fn().mockResolvedValue({
        data: { jobId: 123, status: 'created' }
      });
    });

    test('should create a basic cron job', async () => {
      const jobConfig = {
        job: 'Test Job',
        url: 'https://example.com/webhook',
        schedule: '0 9 * * 1'
      };

      const result = await manager.createCronJob(jobConfig);

      expect(result).toEqual({ jobId: 123, status: 'created' });
      expect(manager.client).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/jobs',
        params: null,
        data: expect.objectContaining({
          job: expect.objectContaining({
            title: 'Test Job',
            url: 'https://example.com/webhook',
            enabled: true,
            requestMethod: 'GET'
          })
        })
      });
    });

    test('should throw error for missing required fields', async () => {
      await expect(manager.createCronJob({})).rejects.toThrow('Missing required fields: job, url, schedule');
      await expect(manager.createCronJob({ job: 'Test' })).rejects.toThrow('Missing required fields: url, schedule');
    });

    test('should validate URL format', async () => {
      const jobConfig = {
        job: 'Test Job',
        url: 'not-a-valid-url',
        schedule: '0 9 * * 1'
      };

      await expect(manager.createCronJob(jobConfig)).rejects.toThrow('Invalid URL provided');
    });

    test('should validate cron expression', async () => {
      const jobConfig = {
        job: 'Test Job',
        url: 'https://example.com',
        schedule: 'invalid-cron'
      };

      await expect(manager.createCronJob(jobConfig)).rejects.toThrow('Invalid cron expression');
    });

    test('should handle custom headers', async () => {
      const jobConfig = {
        job: 'Test Job',
        url: 'https://example.com',
        schedule: '0 9 * * 1',
        headers: {
          'X-Custom-Header': 'value',
          'Authorization': 'Bearer token'
        }
      };

      await manager.createCronJob(jobConfig);

      expect(manager.client).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            job: expect.objectContaining({
              httpHeaders: [
                { key: 'X-Custom-Header', value: 'value' },
                { key: 'Authorization', value: 'Bearer token' }
              ]
            })
          })
        })
      );
    });

    test('should handle authentication config', async () => {
      const jobConfig = {
        job: 'Test Job',
        url: 'https://example.com',
        schedule: '0 9 * * 1',
        auth: {
          username: 'user',
          password: 'pass'
        }
      };

      await manager.createCronJob(jobConfig);

      expect(manager.client).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            job: expect.objectContaining({
              auth: {
                enable: true,
                user: 'user',
                password: 'pass'
              }
            })
          })
        })
      );
    });
  });

  describe('listCronJobs', () => {
    test('should list jobs with default pagination', async () => {
      manager.client = jest.fn().mockResolvedValue({
        data: { jobs: [{ id: 1 }, { id: 2 }] }
      });

      const result = await manager.listCronJobs();

      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
      expect(manager.client).toHaveBeenCalledWith({
        method: 'GET',
        url: '/jobs',
        params: { page: 1, limit: 50 }
      });
    });

    test('should handle custom pagination', async () => {
      manager.client = jest.fn().mockResolvedValue({
        data: { jobs: [] }
      });

      await manager.listCronJobs({ page: 2, limit: 100 });

      expect(manager.client).toHaveBeenCalledWith({
        method: 'GET',
        url: '/jobs',
        params: { page: 2, limit: 100 }
      });
    });

    test('should handle empty response', async () => {
      manager.client = jest.fn().mockResolvedValue({
        data: {}
      });

      const result = await manager.listCronJobs();
      expect(result).toEqual([]);
    });
  });

  describe('getCronJob', () => {
    test('should get a specific job', async () => {
      manager.client = jest.fn().mockResolvedValue({
        data: { id: 123, title: 'Test Job' }
      });

      const result = await manager.getCronJob(123);

      expect(result).toEqual({ id: 123, title: 'Test Job' });
      expect(manager.client).toHaveBeenCalledWith({
        method: 'GET',
        url: '/jobs/123',
        params: null
      });
    });

    test('should throw error if job ID is not provided', async () => {
      await expect(manager.getCronJob()).rejects.toThrow('Job ID is required');
    });
  });

  describe('updateCronJob', () => {
    test('should update a job', async () => {
      // Mock getCronJob
      manager.getCronJob = jest.fn().mockResolvedValue({
        job: { id: 123, title: 'Old Title', url: 'https://example.com' }
      });

      manager.client = jest.fn().mockResolvedValue({
        data: { id: 123, title: 'New Title' }
      });

      const result = await manager.updateCronJob(123, { title: 'New Title' });

      expect(result).toEqual({ id: 123, title: 'New Title' });
      expect(manager.getCronJob).toHaveBeenCalledWith(123);
      expect(manager.client).toHaveBeenCalledWith({
        method: 'PATCH',
        url: '/jobs/123',
        params: null,
        data: expect.any(Object)
      });
    });

    test('should throw error if job ID is not provided', async () => {
      await expect(manager.updateCronJob()).rejects.toThrow('Job ID is required');
    });
  });

  describe('deleteCronJob', () => {
    test('should delete a job', async () => {
      manager.client = jest.fn().mockResolvedValue({});

      const result = await manager.deleteCronJob(123);

      expect(result).toBe(true);
      expect(manager.client).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/jobs/123',
        params: null
      });
    });

    test('should throw error if job ID is not provided', async () => {
      await expect(manager.deleteCronJob()).rejects.toThrow('Job ID is required');
    });
  });

  describe('enableCronJob / disableCronJob', () => {
    beforeEach(() => {
      manager.updateCronJob = jest.fn().mockResolvedValue({ id: 123 });
    });

    test('should enable a job', async () => {
      await manager.enableCronJob(123);
      expect(manager.updateCronJob).toHaveBeenCalledWith(123, { enabled: true });
    });

    test('should disable a job', async () => {
      await manager.disableCronJob(123);
      expect(manager.updateCronJob).toHaveBeenCalledWith(123, { enabled: false });
    });
  });

  describe('getJobHistory', () => {
    test('should get job history', async () => {
      manager.client = jest.fn().mockResolvedValue({
        data: { history: [{ timestamp: '2024-01-01' }] }
      });

      const result = await manager.getJobHistory(123);

      expect(result).toEqual([{ timestamp: '2024-01-01' }]);
      expect(manager.client).toHaveBeenCalledWith({
        method: 'GET',
        url: '/jobs/123/history',
        params: { page: 1, limit: 50 }
      });
    });

    test('should throw error if job ID is not provided', async () => {
      await expect(manager.getJobHistory()).rejects.toThrow('Job ID is required');
    });
  });

  describe('testCronJob', () => {
    test('should test a job', async () => {
      manager.client = jest.fn().mockResolvedValue({
        data: { success: true, response: 'OK' }
      });

      const result = await manager.testCronJob(123);

      expect(result).toEqual({ success: true, response: 'OK' });
      expect(manager.client).toHaveBeenCalledWith({
        method: 'POST',
        url: '/jobs/123/test',
        params: null
      });
    });

    test('should throw error if job ID is not provided', async () => {
      await expect(manager.testCronJob()).rejects.toThrow('Job ID is required');
    });
  });

  describe('getAccountInfo', () => {
    test('should get account info', async () => {
      manager.client = jest.fn().mockResolvedValue({
        data: { plan: 'premium', jobsLimit: 100 }
      });

      const result = await manager.getAccountInfo();

      expect(result).toEqual({ plan: 'premium', jobsLimit: 100 });
      expect(manager.client).toHaveBeenCalledWith({
        method: 'GET',
        url: '/account',
        params: null
      });
    });
  });

  describe('Error handling', () => {
    test('should handle 401 errors', async () => {
      const error = new Error();
      error.response = { status: 401 };
      manager.client = jest.fn().mockRejectedValue(error);

      await expect(manager.listCronJobs()).rejects.toThrow('Failed to list cron jobs: Invalid API key or unauthorized access');
    });

    test('should handle 404 errors', async () => {
      const error = new Error();
      error.response = { status: 404 };
      manager.client = jest.fn().mockRejectedValue(error);

      await expect(manager.getCronJob(999)).rejects.toThrow('Failed to get cron job 999: Resource not found');
    });

    test('should handle 429 rate limit errors', async () => {
      const error = new Error();
      error.response = { status: 429 };
      manager.client = jest.fn().mockRejectedValue(error);

      await expect(manager.listCronJobs()).rejects.toThrow('Failed to list cron jobs: Rate limit exceeded. Please try again later');
    });

    test('should retry on server errors', async () => {
      const error = new Error();
      error.response = { status: 500 };
      
      manager.client = jest.fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ data: { jobs: [] } });

      manager._sleep = jest.fn().mockResolvedValue(); // Mock sleep

      const result = await manager.listCronJobs();

      expect(result).toEqual([]);
      expect(manager.client).toHaveBeenCalledTimes(3);
      expect(manager._sleep).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cron parsing', () => {
    test('should parse simple cron expression', () => {
      const schedule = {
        minutes: [],
        hours: [],
        mdays: [],
        months: [],
        wdays: []
      };

      manager._parseCronExpression('30 14 * * 1', schedule);

      expect(schedule.minutes).toEqual([30]);
      expect(schedule.hours).toEqual([14]);
      expect(schedule.mdays).toEqual([]);
      expect(schedule.months).toEqual([]);
      expect(schedule.wdays).toEqual([1]);
    });

    test('should parse ranges', () => {
      const schedule = {
        minutes: [],
        hours: [],
        mdays: [],
        months: [],
        wdays: []
      };

      manager._parseCronExpression('0 9-17 * * *', schedule);

      expect(schedule.hours).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
    });

    test('should parse lists', () => {
      const schedule = {
        minutes: [],
        hours: [],
        mdays: [],
        months: [],
        wdays: []
      };

      manager._parseCronExpression('0,15,30,45 * * * *', schedule);

      expect(schedule.minutes).toEqual([0, 15, 30, 45]);
    });

    test('should parse steps', () => {
      const schedule = {
        minutes: [],
        hours: [],
        mdays: [],
        months: [],
        wdays: []
      };

      manager._parseCronExpression('*/15 * * * *', schedule);

      expect(schedule.minutes).toEqual([0, 15, 30, 45]);
    });
  });

  describe('Debug mode', () => {
    test('should enable and disable debug mode', () => {
      expect(manager.debug).toBeUndefined();
      
      manager.enableDebug();
      expect(manager.debug).toBe(true);
      
      manager.disableDebug();
      expect(manager.debug).toBe(false);
    });
  });
});