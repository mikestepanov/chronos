const EventEmitter = require('events');

/**
 * Extraction Queue
 * Handles concurrent extraction requests with proper queuing and deduplication
 */
class ExtractionQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.processing = false;
    this.inProgress = new Map(); // periodId -> Promise
    this.recentExtractions = new Map(); // periodId -> { timestamp, version }
    this.DEBOUNCE_TIME = 30000; // 30 seconds between extractions for same period
  }

  /**
   * Add extraction request to queue
   * @returns {Promise} Resolves when extraction completes
   */
  async addRequest(periodId, userId, metadata = {}) {
    console.log(`Queue: Adding request for period ${periodId} from user ${userId}`);
    
    // Check if we recently extracted this period
    const recent = this.recentExtractions.get(periodId);
    if (recent && Date.now() - recent.timestamp < this.DEBOUNCE_TIME) {
      console.log(`Queue: Using recent extraction for ${periodId} (v${recent.version})`);
      return {
        success: true,
        fromCache: true,
        version: recent.version,
        timestamp: recent.timestamp
      };
    }
    
    // Check if extraction is already in progress for this period
    if (this.inProgress.has(periodId)) {
      console.log(`Queue: Extraction already in progress for ${periodId}, waiting...`);
      return this.inProgress.get(periodId);
    }
    
    // Create promise for this extraction
    const extractionPromise = new Promise((resolve, reject) => {
      this.queue.push({
        periodId,
        userId,
        metadata,
        timestamp: Date.now(),
        resolve,
        reject
      });
    });
    
    // Store as in-progress
    this.inProgress.set(periodId, extractionPromise);
    
    // Clean up after completion
    extractionPromise.finally(() => {
      this.inProgress.delete(periodId);
    });
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
    
    return extractionPromise;
  }

  /**
   * Process queued extraction requests
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      // Group requests by period
      const currentPeriod = this.queue[0].periodId;
      const requests = [];
      
      // Collect all requests for the same period
      while (this.queue.length > 0 && this.queue[0].periodId === currentPeriod) {
        requests.push(this.queue.shift());
      }
      
      console.log(`Queue: Processing ${requests.length} requests for period ${currentPeriod}`);
      
      try {
        // Emit extraction event
        const result = await new Promise((resolve, reject) => {
          this.emit('extract', {
            periodId: currentPeriod,
            requests,
            resolve,
            reject
          });
        });
        
        // Update recent extractions cache
        this.recentExtractions.set(currentPeriod, {
          timestamp: Date.now(),
          version: result.metadata.version
        });
        
        // Resolve all requests for this period
        requests.forEach(req => {
          req.resolve({
            ...result,
            requestedBy: req.userId,
            queuedRequests: requests.length
          });
        });
        
      } catch (error) {
        // Reject all requests for this period
        requests.forEach(req => {
          req.reject(error);
        });
      }
      
      // Small delay between different periods
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    this.processing = false;
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      inProgress: Array.from(this.inProgress.keys()),
      recentExtractions: Array.from(this.recentExtractions.entries()).map(([periodId, data]) => ({
        periodId,
        version: data.version,
        age: Date.now() - data.timestamp
      }))
    };
  }

  /**
   * Clear cache for a specific period
   */
  clearCache(periodId) {
    this.recentExtractions.delete(periodId);
  }
}

module.exports = ExtractionQueue;