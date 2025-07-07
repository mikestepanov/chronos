const axios = require('axios');

/**
 * Resilient message sender with retry logic
 */
class ResilientSender {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 5;
    this.retryDelay = options.retryDelay || 5000; // 5 seconds
    this.backoffMultiplier = options.backoffMultiplier || 2;
    // Custom delays for attempts 4 and 5
    this.customDelays = options.customDelays || {
      4: 60000,   // 1 minute for 4th retry
      5: 300000   // 5 minutes for 5th retry
    };
  }

  /**
   * Send message with automatic retries
   */
  async sendWithRetry(sendFunction, context, description) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${this.maxRetries}: ${description}`);
        const result = await sendFunction.call(context);
        console.log(`✅ Success on attempt ${attempt}`);
        return result;
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          // Use custom delays for attempts 4 and 5, otherwise exponential backoff
          let delay;
          if (this.customDelays[attempt + 1]) {
            delay = this.customDelays[attempt + 1];
          } else {
            delay = this.retryDelay * Math.pow(this.backoffMultiplier, attempt - 1);
          }
          
          const delayMinutes = delay >= 60000 ? `${Math.round(delay/60000)} minute${delay >= 120000 ? 's' : ''}` : `${delay/1000} seconds`;
          console.log(`⏳ Waiting ${delayMinutes} before retry...`);
          await this.sleep(delay);
        }
      }
    }
    
    // All retries failed
    throw new Error(`Failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Test network connectivity
   */
  async testConnectivity() {
    try {
      await axios.get('https://api.pumble.com', { timeout: 5000 });
      return true;
    } catch (error) {
      console.error('Network connectivity test failed:', error.message);
      return false;
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Send critical notification with fallback
   */
  async sendCriticalMessage(primarySender, fallbackSenders = []) {
    try {
      // Try primary method
      return await this.sendWithRetry(primarySender.send, primarySender, primarySender.description);
    } catch (primaryError) {
      console.error('Primary send method failed:', primaryError.message);
      
      // Try fallbacks
      for (const fallback of fallbackSenders) {
        try {
          console.log(`Trying fallback: ${fallback.description}`);
          return await this.sendWithRetry(fallback.send, fallback, fallback.description);
        } catch (fallbackError) {
          console.error(`Fallback failed: ${fallback.description}`, fallbackError.message);
        }
      }
      
      throw new Error('All send methods failed');
    }
  }
}

module.exports = ResilientSender;