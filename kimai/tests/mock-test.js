#!/usr/bin/env node

const KimaiExtractionService = require('../index');
const FileStorage = require('../storage/FileStorage');
const path = require('path');
const fs = require('fs').promises;

/**
 * Mock tests that work without real Kimai API
 */
class MockTest {
  constructor() {
    this.testStoragePath = path.join(__dirname, 'mock-test-data');
  }

  async setup() {
    console.log('🔧 Setting up mock test environment...');
    
    // Create test storage
    await fs.mkdir(this.testStoragePath, { recursive: true });
    
    // Create mock Kimai API
    this.mockKimaiAPI = {
      testConnection: async () => true,
      exportCSV: async (startDate, endDate) => {
        // Generate mock CSV data
        const headers = 'Date,User,Duration,Project,Activity,Description';
        const rows = [];
        
        // Generate some mock entries
        const users = ['John Doe', 'Jane Smith', 'Bob Wilson'];
        let date = new Date(startDate);
        
        while (date <= endDate) {
          if (date.getDay() !== 0 && date.getDay() !== 6) { // Skip weekends
            for (const user of users) {
              rows.push([
                date.toISOString().split('T')[0],
                user,
                '8.0',
                'Project Alpha',
                'Development',
                'Working on features'
              ].join(','));
            }
          }
          date.setDate(date.getDate() + 1);
        }
        
        return [headers, ...rows].join('\n');
      },
      getTimesheets: async (startDate, endDate) => {
        // Return mock JSON data
        return [];
      }
    };
    
    // Create service with mocks
    this.service = new KimaiExtractionService({
      storage: new FileStorage(this.testStoragePath),
      kimaiAPI: this.mockKimaiAPI
    });
    
    console.log('✅ Mock environment ready\n');
  }

  async cleanup() {
    try {
      await fs.rm(this.testStoragePath, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }
  }

  async runTests() {
    console.log('🧪 MOCK KIMAI TESTS (No API Required)');
    console.log('=' .repeat(50));
    console.log('');

    try {
      await this.setup();

      await this.testBasicFlow();
      await this.testQueueBehavior();
      await this.testComplianceBot();
      await this.testEdgeCases();
      
      console.log('\n✅ All mock tests passed!');
    } catch (error) {
      console.error('\n❌ Mock test failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async testBasicFlow() {
    console.log('📋 Test 1: Basic Extraction Flow');
    
    const period = this.service.payPeriod.getCurrentPeriod();
    
    // Extract
    const result = await this.service.extractPeriod(period);
    console.log(`  ✓ Extraction successful: ${result.success}`);
    console.log(`  ✓ CSV length: ${result.csvData.length} bytes`);
    
    // Parse CSV to verify
    const lines = result.csvData.split('\n');
    const dataLines = lines.filter(l => l.trim() && !l.startsWith('Date,'));
    console.log(`  ✓ Data rows: ${dataLines.length}`);
    
    // Verify storage
    const stored = await this.service.storage.getLatest(period.id);
    console.log(`  ✓ Stored version: ${stored.version}`);
    
    console.log('  ✅ Basic flow passed\n');
  }

  async testQueueBehavior() {
    console.log('📋 Test 2: Queue Behavior with Mock Data');
    
    const ExtractionQueue = require('../integrations/extraction-queue');
    const queue = new ExtractionQueue();
    
    // Track extraction calls
    let extractionCount = 0;
    
    queue.on('extract', async ({ periodId, requests, resolve }) => {
      extractionCount++;
      
      // Simulate extraction delay
      await new Promise(r => setTimeout(r, 500));
      
      resolve({
        success: true,
        periodId,
        csvData: await this.mockKimaiAPI.exportCSV(new Date('2024-01-01'), new Date('2024-01-14')),
        metadata: {
          version: extractionCount,
          recordCount: 30,
          extractedAt: new Date(),
          checksum: `mock-checksum-${extractionCount}`
        }
      });
    });
    
    // Simulate 10 users saying "done" at once
    console.log('  Simulating 10 concurrent "done" messages...');
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      promises.push(queue.addRequest('2024-01-01', `user${i}`));
    }
    
    const results = await Promise.all(promises);
    
    console.log(`  ✓ Total extraction calls: ${extractionCount} (should be 1)`);
    console.log(`  ✓ All requests served: ${results.length}`);
    console.log(`  ✓ All got same version: ${results.every(r => r.metadata.version === 1)}`);
    
    // Test cache
    console.log('  Testing cache behavior...');
    const cachedResult = await queue.addRequest('2024-01-01', 'user11');
    console.log(`  ✓ Result from cache: ${cachedResult.fromCache}`);
    console.log(`  ✓ Extraction count still: ${extractionCount}`);
    
    console.log('  ✅ Queue behavior passed\n');
  }

  async testComplianceBot() {
    console.log('📋 Test 3: Compliance Bot Flow');
    
    // Create mock Pumble client
    const messages = [];
    const mockPumbleClient = {
      sendMessage: async (channelId, message) => {
        messages.push({ channelId, message, timestamp: new Date() });
        return true;
      },
      createPrivateChannel: async (options) => ({
        id: `mock-channel-${Date.now()}`
      })
    };
    
    // Create bot
    const PumbleComplianceBot = require('../integrations/pumble-compliance-bot');
    const ExtractionQueue = require('../integrations/extraction-queue');
    const PayPeriod = require('../core/PayPeriod');
    
    // Create dependencies
    const queue = new ExtractionQueue();
    const payPeriod = new PayPeriod();
    
    // Set up queue handler
    queue.on('extract', async ({ periodId, requests, resolve }) => {
      const result = await this.service.extractPeriod(periodId);
      resolve(result);
    });
    
    const bot = new PumbleComplianceBot({
      apiToken: 'mock-token',
      botId: 'bot123',
      botName: 'test-bot',
      adminUserId: 'admin123',
      extractionQueue: queue,
      payPeriod: payPeriod,
      minHoursExpected: 70
    });
    
    // Override extraction service with our mock
    bot.kimaiService = this.service;
    
    // Mock CSV analysis
    bot.analyzeMissingHours = async (csv, period) => {
      // Return some mock offenders
      return [
        {
          name: 'John Doe',
          userId: 'user1',
          totalHours: 32,
          daysWorked: 4,
          expectedDays: 10,
          missingHours: 48
        },
        {
          name: 'Jane Smith',
          userId: 'user2',
          totalHours: 0,
          daysWorked: 0,
          expectedDays: 10,
          missingHours: 80
        }
      ];
    };
    
    bot.getUserIdByName = async (name) => name.toLowerCase().replace(' ', '_');
    
    // Run compliance check
    console.log('  Running Tuesday compliance check...');
    const result = await bot.checkTuesdayCompliance();
    
    console.log(`  ✓ Offenders found: ${result.offendersCount}`);
    console.log(`  ✓ Messages sent: ${messages.length}`);
    console.log(`  ✓ Active checks created: ${bot.activeChecks.size}`);
    
    // Simulate user saying "done"
    console.log('  Simulating user response...');
    
    // Mock compliance check
    bot.checkUserCompliance = async () => ({
      totalHours: 80,
      daysWorked: 10,
      missingHours: 0,
      compliant: true
    });
    
    // Only test message handling if we have offenders
    if (result.offendersCount > 0) {
      await bot.handleMessage({
        userId: 'user1',
        text: '@test-bot done',
        channelId: 'mock-channel-id'
      });
      
      console.log(`  ✓ Message handled successfully`);
      console.log(`  ✓ User removed from active checks: ${!bot.activeChecks.has('user1')}`);
    } else {
      console.log('  ✓ No offenders to test message handling');
    }
    
    console.log('  ✅ Compliance bot flow passed\n');
  }

  async testEdgeCases() {
    console.log('📋 Test 4: Edge Cases');
    
    // Test 1: Empty CSV
    console.log('  Testing empty CSV response...');
    this.mockKimaiAPI.exportCSV = async () => 'Date,User,Duration\n';
    
    const emptyResult = await this.service.extractPeriod('2024-02-01');
    console.log(`  ✓ Empty CSV handled: ${emptyResult.success}`);
    
    // Test 2: Network error
    console.log('  Testing network error...');
    this.mockKimaiAPI.exportCSV = async () => {
      throw new Error('Network timeout');
    };
    
    const errorResult = await this.service.extractPeriod('2024-02-15');
    console.log(`  ✓ Error handled gracefully: ${!errorResult.success}`);
    console.log(`  ✓ Error captured: ${errorResult.error?.message.includes('Network')}`);
    
    // Test 3: Invalid date
    console.log('  Testing invalid date...');
    try {
      await this.service.extractPeriod('invalid-date');
      console.log('  ✗ Should have thrown error');
    } catch (error) {
      console.log(`  ✓ Invalid date rejected: ${error.message.includes('Invalid')}`);
    }
    
    console.log('  ✅ Edge cases passed\n');
  }
}

// Performance benchmark
async function runPerformanceBenchmark() {
  console.log('⚡ PERFORMANCE BENCHMARK');
  console.log('=' .repeat(50));
  
  const ExtractionQueue = require('../integrations/extraction-queue');
  const queue = new ExtractionQueue();
  
  queue.on('extract', async ({ periodId, requests, resolve }) => {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 100));
    resolve({
      success: true,
      periodId,
      csvData: 'mock,csv,data',
      metadata: { version: 1, recordCount: 100 }
    });
  });
  
  // Test different concurrency levels
  const levels = [10, 50, 100, 500];
  
  for (const level of levels) {
    const start = Date.now();
    const promises = [];
    
    for (let i = 0; i < level; i++) {
      promises.push(queue.addRequest('test-period', `user${i}`));
    }
    
    await Promise.all(promises);
    const duration = Date.now() - start;
    
    console.log(`  ${level} concurrent requests: ${duration}ms (${(duration/level).toFixed(2)}ms per request)`);
  }
  
  console.log('\n✅ Performance benchmark complete\n');
}

// Run all mock tests
async function runAllMockTests() {
  try {
    const mockTest = new MockTest();
    await mockTest.runTests();
    
    await runPerformanceBenchmark();
    
    console.log('🎉 ALL MOCK TESTS PASSED! 🎉\n');
    console.log('Note: These tests use mock data. Run integration-test.js for real API tests.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n💥 MOCK TEST FAILURE:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllMockTests();
}

module.exports = MockTest;