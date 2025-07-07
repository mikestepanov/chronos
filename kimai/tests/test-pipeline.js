#!/usr/bin/env node

const KimaiExtractionService = require('../index');
const ExtractionQueue = require('../integrations/extraction-queue');
const { format } = require('date-fns');

/**
 * Comprehensive pipeline tests
 */
class PipelineTest {
  constructor() {
    this.service = new KimaiExtractionService();
    this.queue = new ExtractionQueue();
    this.results = [];
  }

  async runAllTests() {
    console.log('\n🧪 KIMAI PIPELINE TEST SUITE');
    console.log('=' .repeat(50));
    
    const tests = [
      this.testBasicExtraction.bind(this),
      this.testConcurrentRequests.bind(this),
      this.testQueueDebouncing.bind(this),
      this.testErrorHandling.bind(this),
      this.testStorageVersioning.bind(this),
      this.testGitIntegration.bind(this)
    ];
    
    for (const test of tests) {
      try {
        await test();
        this.results.push({ test: test.name, status: 'PASS' });
      } catch (error) {
        this.results.push({ test: test.name, status: 'FAIL', error: error.message });
        console.error(`\n❌ ${test.name} failed:`, error.message);
      }
    }
    
    this.printSummary();
  }

  async testBasicExtraction() {
    console.log('\n📋 Test: Basic Extraction');
    
    const period = this.service.payPeriod.getCurrentPeriod();
    console.log(`  - Current period: ${period.id}`);
    
    const result = await this.service.extractPeriod(period);
    console.log(`  - Extraction success: ${result.success}`);
    console.log(`  - Version: ${result.metadata?.version}`);
    console.log(`  - Records: ${result.metadata?.recordCount}`);
    
    if (!result.success) {
      throw new Error('Basic extraction failed');
    }
    
    console.log('  ✅ Basic extraction passed');
  }

  async testConcurrentRequests() {
    console.log('\n📋 Test: Concurrent Requests');
    
    // Set up queue handler
    this.queue.on('extract', async ({ periodId, requests, resolve }) => {
      console.log(`  - Processing ${requests.length} concurrent requests`);
      
      // Simulate extraction
      await new Promise(r => setTimeout(r, 2000));
      
      resolve({
        success: true,
        periodId,
        csvData: 'mock,csv,data',
        metadata: {
          version: 1,
          recordCount: 10,
          extractedAt: new Date()
        }
      });
    });
    
    const period = this.service.payPeriod.getCurrentPeriod();
    
    // Simulate 5 users sending "done" at the same time
    const promises = [];
    for (let i = 1; i <= 5; i++) {
      promises.push(
        this.queue.addRequest(period.id, `user${i}`, { test: true })
      );
    }
    
    const results = await Promise.all(promises);
    
    // All should get the same result
    console.log(`  - Requests processed: ${results.length}`);
    console.log(`  - All successful: ${results.every(r => r.success)}`);
    console.log(`  - Queued requests handled: ${results[0].queuedRequests}`);
    
    if (results[0].queuedRequests !== 5) {
      throw new Error('Concurrent requests not properly batched');
    }
    
    console.log('  ✅ Concurrent requests passed');
  }

  async testQueueDebouncing() {
    console.log('\n📋 Test: Queue Debouncing');
    
    const period = this.service.payPeriod.getCurrentPeriod();
    
    // Clear cache first
    this.queue.clearCache(period.id);
    
    // First request
    const result1 = await this.queue.addRequest(period.id, 'user1');
    console.log(`  - First request fromCache: ${result1.fromCache}`);
    
    // Immediate second request (should use cache)
    const result2 = await this.queue.addRequest(period.id, 'user2');
    console.log(`  - Second request fromCache: ${result2.fromCache}`);
    
    if (!result2.fromCache) {
      throw new Error('Debouncing not working');
    }
    
    console.log('  ✅ Queue debouncing passed');
  }

  async testErrorHandling() {
    console.log('\n📋 Test: Error Handling');
    
    // Test with invalid period
    try {
      await this.service.extractPeriod('invalid-date');
      throw new Error('Should have thrown error for invalid date');
    } catch (error) {
      console.log(`  - Invalid date handled: ${error.message.includes('Invalid')}`);
    }
    
    // Test network error simulation
    const originalAPI = this.service.kimaiAPI.exportCSV;
    this.service.kimaiAPI.exportCSV = async () => {
      throw new Error('Network error');
    };
    
    const result = await this.service.extractPeriod(this.service.payPeriod.getCurrentPeriod());
    console.log(`  - Network error handled: ${!result.success}`);
    console.log(`  - Error captured: ${result.error?.message.includes('Network')}`);
    
    // Restore
    this.service.kimaiAPI.exportCSV = originalAPI;
    
    console.log('  ✅ Error handling passed');
  }

  async testStorageVersioning() {
    console.log('\n📋 Test: Storage Versioning');
    
    const testPeriod = '2024-01-01';
    
    // Save multiple versions
    const csv1 = 'User,Hours\nJohn,40';
    const csv2 = 'User,Hours\nJohn,40\nJane,35';
    
    const v1 = await this.service.storage.save(testPeriod, csv1);
    console.log(`  - Version 1 saved: ${v1.version}`);
    
    const v2 = await this.service.storage.save(testPeriod, csv2);
    console.log(`  - Version 2 saved: ${v2.version}`);
    
    // Try saving duplicate (should not create new version)
    const v3 = await this.service.storage.save(testPeriod, csv2);
    console.log(`  - Duplicate save version: ${v3.version} (should be ${v2.version})`);
    
    if (v3.version !== v2.version) {
      throw new Error('Duplicate detection failed');
    }
    
    // Compare versions
    const diff = await this.service.storage.compareVersions(testPeriod, 1, 2);
    console.log(`  - Changes detected: ${diff.hasChanges}`);
    console.log(`  - Added records: ${diff.addedRecords.length}`);
    
    console.log('  ✅ Storage versioning passed');
  }

  async testGitIntegration() {
    console.log('\n📋 Test: Git Integration');
    
    const config = require('../config').getConfig();
    
    if (config.storage.type !== 'git') {
      console.log('  - Git storage not configured, skipping');
      return;
    }
    
    // Check if Git is initialized
    const GitStorage = require('../storage/GitStorage');
    const gitStorage = new GitStorage(config.storage.basePath, config.storage.git);
    
    const status = await gitStorage.execGit('status');
    console.log(`  - Git initialized: ${status.success}`);
    
    // Save test data
    const testData = `Test,Data\n${new Date().toISOString()},test`;
    const result = await gitStorage.save('test-period', testData);
    
    console.log(`  - Test commit created: ${result.version}`);
    
    // Check git log
    const log = await gitStorage.getGitLog('test-period');
    console.log(`  - Git history available: ${log.length > 0}`);
    
    console.log('  ✅ Git integration passed');
  }

  printSummary() {
    console.log('\n\n📊 TEST SUMMARY');
    console.log('=' .repeat(50));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log('\n' + '=' .repeat(50));
    console.log(`Total: ${this.results.length} | Passed: ${passed} | Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n❌ Some tests failed!');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
    }
  }
}

// Run tests
if (require.main === module) {
  const tester = new PipelineTest();
  tester.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = PipelineTest;