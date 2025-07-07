#!/usr/bin/env node

const ResilientSender = require('../shared/resilient-sender');

async function demonstrateRetryTiming() {
  console.log('🧪 Demonstrating retry timing with 5 attempts:\n');
  
  const resilient = new ResilientSender({
    maxRetries: 5,
    retryDelay: 5000,
    backoffMultiplier: 2,
    customDelays: {
      4: 60000,   // 1 minute
      5: 300000   // 5 minutes
    }
  });
  
  // Calculate total time
  const delays = [
    0,                    // Attempt 1: immediate
    5000,                 // Attempt 2: 5 seconds
    10000,                // Attempt 3: 10 seconds  
    60000,                // Attempt 4: 1 minute
    300000                // Attempt 5: 5 minutes
  ];
  
  console.log('Retry Schedule:');
  console.log('---------------');
  
  let totalTime = 0;
  for (let i = 0; i < delays.length; i++) {
    const attempt = i + 1;
    const delay = delays[i];
    totalTime += delay;
    
    const timeStr = delay === 0 ? 'Immediate' : 
                   delay < 60000 ? `${delay/1000} seconds` :
                   `${delay/60000} minute${delay > 60000 ? 's' : ''}`;
    
    const cumulative = totalTime === 0 ? '' : 
                      totalTime < 60000 ? ` (total: ${totalTime/1000}s)` :
                      ` (total: ${Math.round(totalTime/60000)}m ${(totalTime%60000)/1000}s)`;
    
    console.log(`Attempt ${attempt}: ${timeStr}${cumulative}`);
  }
  
  console.log('\nTotal time if all attempts fail: 6 minutes 15 seconds');
  console.log('\nThis gives plenty of time for:');
  console.log('- Network issues to resolve');
  console.log('- API service to recover');  
  console.log('- Rate limits to reset');
  console.log('- Temporary outages to end');
  
  // Simulate failure scenario
  console.log('\n\n📊 Simulating a failure scenario...\n');
  
  const failingFunction = {
    attempts: 0,
    send: async function() {
      this.attempts++;
      if (this.attempts <= 3) {
        throw new Error('Network timeout');
      } else if (this.attempts === 4) {
        throw new Error('Service temporarily unavailable');
      } else {
        // Success on 5th attempt
        return { success: true, message: 'Finally worked!' };
      }
    },
    description: 'Pumble API call'
  };
  
  try {
    const result = await resilient.sendWithRetry(
      failingFunction.send,
      failingFunction,
      failingFunction.description
    );
    console.log('\n✅ Success!', result);
  } catch (error) {
    console.log('\n❌ Failed after all retries:', error.message);
  }
}

demonstrateRetryTiming();