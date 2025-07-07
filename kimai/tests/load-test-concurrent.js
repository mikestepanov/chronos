#!/usr/bin/env node

const PumbleComplianceBot = require('../integrations/pumble-compliance-bot');
const { performance } = require('perf_hooks');

/**
 * Load test for concurrent "done" messages
 */
class ConcurrentLoadTest {
  constructor() {
    this.results = [];
  }

  async runTest(numUsers = 10) {
    console.log(`\n🔥 CONCURRENT LOAD TEST`);
    console.log(`Testing with ${numUsers} simultaneous "done" messages`);
    console.log('=' .repeat(50));

    // Mock Pumble client
    const mockPumbleClient = {
      sendMessage: async (channelId, message) => {
        console.log(`[Channel ${channelId}] ${message.substring(0, 50)}...`);
      },
      createPrivateChannel: async (options) => ({
        id: `channel_${Date.now()}_${Math.random()}`
      })
    };

    // Create dependencies
    const ExtractionQueue = require('../integrations/extraction-queue');
    const PayPeriod = require('../core/PayPeriod');
    
    const queue = new ExtractionQueue();
    const payPeriod = new PayPeriod();
    
    // Mock extraction handler
    queue.on('extract', async ({ periodId, requests, resolve }) => {
      await new Promise(r => setTimeout(r, 100)); // Simulate API delay
      resolve({
        success: true,
        periodId,
        csvData: 'mock,csv,data',
        metadata: { version: 1, recordCount: 100 }
      });
    });
    
    // Create bot instance
    const bot = new PumbleComplianceBot({
      apiToken: 'mock-token',
      botId: 'bot123',
      botName: 'timesheet-bot',
      adminUserId: 'admin123',
      extractionQueue: queue,
      payPeriod: payPeriod,
      minHoursExpected: 70
    });

    // Mock active checks for test users
    const testPeriod = payPeriod.getCurrentPeriod();
    
    for (let i = 1; i <= numUsers; i++) {
      bot.activeChecks.set(`user${i}`, {
        periodId: testPeriod.id,
        channelId: `channel${i}`,
        offenderName: `User${i}`,
        startedAt: new Date(),
        initialHours: 40,
        initialDays: 5
      });
    }

    // Mock checkUserCompliance to return random results
    bot.checkUserCompliance = async (userId, userName, csv) => {
      await new Promise(r => setTimeout(r, Math.random() * 100)); // Simulate processing
      return {
        totalHours: 80 + Math.random() * 10,
        daysWorked: 10,
        missingHours: 0,
        compliant: Math.random() > 0.3 // 70% become compliant
      };
    };

    console.log('\n📨 Simulating concurrent "done" messages...\n');

    // Track timing
    const startTime = performance.now();
    
    // Create promises for all users saying "done" at once
    const promises = [];
    for (let i = 1; i <= numUsers; i++) {
      const message = {
        userId: `user${i}`,
        text: '@timesheet-bot done',
        channelId: `channel${i}`,
        timestamp: new Date()
      };
      
      promises.push(
        bot.handleMessage(message).then(() => ({
          userId: `user${i}`,
          success: true,
          timestamp: performance.now()
        })).catch(error => ({
          userId: `user${i}`,
          success: false,
          error: error.message,
          timestamp: performance.now()
        }))
      );
    }

    // Wait for all to complete
    const results = await Promise.all(promises);
    const endTime = performance.now();

    // Analyze results
    console.log('\n\n📊 RESULTS');
    console.log('=' .repeat(50));

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalTime = endTime - startTime;

    console.log(`Total users: ${numUsers}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`Average time per user: ${(totalTime / numUsers).toFixed(2)}ms`);

    // Check queue statistics
    const queueStatus = bot.extractionQueue.getStatus();
    console.log(`\nQueue Statistics:`);
    console.log(`- Queue length: ${queueStatus.queueLength}`);
    console.log(`- Still processing: ${queueStatus.processing}`);
    console.log(`- In progress: ${queueStatus.inProgress.length}`);
    console.log(`- Cached extractions: ${queueStatus.recentExtractions.length}`);

    // Show timing distribution
    console.log(`\nTiming Distribution:`);
    const timings = results.map(r => r.timestamp - startTime).sort((a, b) => a - b);
    console.log(`- Fastest: ${timings[0].toFixed(2)}ms`);
    console.log(`- Median: ${timings[Math.floor(timings.length / 2)].toFixed(2)}ms`);
    console.log(`- Slowest: ${timings[timings.length - 1].toFixed(2)}ms`);

    // Test different scenarios
    if (numUsers <= 10) {
      console.log('\n\n🔄 Running additional test scenarios...\n');
      
      // Test 1: Staggered requests
      await this.testStaggeredRequests(bot, 5);
      
      // Test 2: Repeated requests from same user
      await this.testRepeatedRequests(bot);
      
      // Test 3: Mixed period requests
      await this.testMixedPeriods(bot);
    }

    return results;
  }

  async testStaggeredRequests(bot, numUsers) {
    console.log('📋 Test: Staggered Requests (100ms apart)');
    
    const promises = [];
    for (let i = 1; i <= numUsers; i++) {
      await new Promise(r => setTimeout(r, 100));
      
      promises.push(bot.handleMessage({
        userId: `staggered${i}`,
        text: '@timesheet-bot done',
        channelId: `channel_staggered${i}`
      }));
    }
    
    await Promise.all(promises);
    console.log('  ✅ Staggered requests completed');
  }

  async testRepeatedRequests(bot) {
    console.log('\n📋 Test: Repeated Requests from Same User');
    
    const userId = 'repeat_user';
    bot.activeChecks.set(userId, {
      periodId: '2024-01-01',
      channelId: 'repeat_channel',
      offenderName: 'RepeatUser',
      startedAt: new Date(),
      initialHours: 40,
      initialDays: 5
    });
    
    // Send 3 "done" messages rapidly
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(bot.handleMessage({
        userId,
        text: '@timesheet-bot done',
        channelId: 'repeat_channel'
      }));
    }
    
    await Promise.all(promises);
    console.log('  ✅ Repeated requests handled');
  }

  async testMixedPeriods(bot) {
    console.log('\n📋 Test: Mixed Period Requests');
    
    // Create checks for different periods
    const periods = ['2024-01-01', '2024-01-15', '2024-01-29'];
    const promises = [];
    
    periods.forEach((periodId, idx) => {
      const userId = `mixed${idx}`;
      bot.activeChecks.set(userId, {
        periodId,
        channelId: `mixed_channel${idx}`,
        offenderName: `MixedUser${idx}`,
        startedAt: new Date(),
        initialHours: 40,
        initialDays: 5
      });
      
      promises.push(bot.handleMessage({
        userId,
        text: '@timesheet-bot done',
        channelId: `mixed_channel${idx}`
      }));
    });
    
    await Promise.all(promises);
    console.log('  ✅ Mixed period requests completed');
  }
}

// Run load test
if (require.main === module) {
  const tester = new ConcurrentLoadTest();
  
  const numUsers = parseInt(process.argv[2]) || 10;
  
  tester.runTest(numUsers).then(() => {
    console.log('\n✅ Load test completed successfully!');
  }).catch(error => {
    console.error('\n❌ Load test failed:', error);
    process.exit(1);
  });
}

module.exports = ConcurrentLoadTest;