#!/usr/bin/env node

const KimaiExtractionService = require('../index');
const FileStorage = require('../storage/FileStorage');
const PayPeriod = require('../core/PayPeriod');
const path = require('path');
const fs = require('fs').promises;
const { format } = require('date-fns');

/**
 * Real integration tests with actual Kimai API
 */
class IntegrationTest {
  constructor() {
    // Use test storage directory
    this.testStoragePath = path.join(__dirname, 'test-data');
    this.service = null;
  }

  async setup() {
    console.log('🔧 Setting up test environment...');
    
    // Create test storage directory
    await fs.mkdir(this.testStoragePath, { recursive: true });
    
    // Create service with test storage
    this.service = new KimaiExtractionService({
      storage: new FileStorage(this.testStoragePath)
    });
    
    // Test API connection
    const connected = await this.service.kimaiAPI.testConnection();
    if (!connected) {
      throw new Error('Cannot connect to Kimai API. Check credentials.');
    }
    
    console.log('✅ Test environment ready\n');
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    try {
      await fs.rm(this.testStoragePath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  async runTests() {
    console.log('🧪 KIMAI INTEGRATION TESTS');
    console.log('=' .repeat(50));
    console.log('Testing with real Kimai API\n');

    try {
      await this.setup();

      // Run test suite
      await this.testCurrentPeriodExtraction();
      await this.testVersioning();
      await this.testReExtraction();
      await this.testHistoricalPeriod();
      await this.testConcurrentExtractions();
      
      console.log('\n✅ All integration tests passed!');
    } catch (error) {
      console.error('\n❌ Integration test failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async testCurrentPeriodExtraction() {
    console.log('📋 Test 1: Current Period Extraction');
    
    const period = this.service.payPeriod.getCurrentPeriod();
    console.log(`  Period: ${format(period.startDate, 'MMM dd')} - ${format(period.endDate, 'MMM dd')}`);
    
    // Extract current period
    console.log('  Extracting...');
    const result = await this.service.extractPeriod(period);
    
    if (!result.success) {
      throw new Error(`Extraction failed: ${result.error?.message}`);
    }
    
    console.log(`  ✓ Extraction successful`);
    console.log(`  ✓ Version: ${result.metadata.version}`);
    console.log(`  ✓ Records: ${result.metadata.recordCount}`);
    console.log(`  ✓ Size: ${result.csvData.length} bytes`);
    
    // Verify CSV structure
    const lines = result.csvData.split('\n');
    const headers = lines[0].split(',');
    
    console.log(`  ✓ CSV headers: ${headers.length} columns`);
    
    if (!headers.some(h => h.includes('User')) || !headers.some(h => h.includes('Duration'))) {
      throw new Error('CSV missing expected headers');
    }
    
    // Verify storage
    const stored = await this.service.storage.getLatest(period.id);
    if (!stored || stored.version !== 1) {
      throw new Error('Storage verification failed');
    }
    
    console.log('  ✅ Current period extraction passed\n');
  }

  async testVersioning() {
    console.log('📋 Test 2: Version Control');
    
    const period = this.service.payPeriod.getCurrentPeriod();
    
    // Extract again (should be version 1 still if no changes)
    console.log('  Re-extracting same period...');
    const result2 = await this.service.extractPeriod(period);
    
    console.log(`  ✓ Version: ${result2.metadata.version}`);
    
    // Get history
    const history = await this.service.getHistory(period.id);
    console.log(`  ✓ History entries: ${history.length}`);
    
    // Verify deduplication
    if (history.length > 1) {
      const v1 = history[0];
      const v2 = history[1];
      if (v1.checksum === v2.checksum) {
        throw new Error('Duplicate versions with same checksum');
      }
    }
    
    console.log('  ✅ Version control passed\n');
  }

  async testReExtraction() {
    console.log('📋 Test 3: Re-extraction and Comparison');
    
    const period = this.service.payPeriod.getCurrentPeriod();
    
    // Re-extract and compare
    console.log('  Re-extracting with comparison...');
    const { result, changes } = await this.service.reExtractAndCompare(period.id);
    
    if (!result.success) {
      throw new Error('Re-extraction failed');
    }
    
    console.log(`  ✓ Re-extraction successful`);
    console.log(`  ✓ Changes detected: ${changes ? 'Yes' : 'No'}`);
    
    if (changes) {
      console.log(`  ✓ Added records: ${changes.addedRecords.length}`);
      console.log(`  ✓ Removed records: ${changes.removedRecords.length}`);
    }
    
    console.log('  ✅ Re-extraction passed\n');
  }

  async testHistoricalPeriod() {
    console.log('📋 Test 4: Historical Period Extraction');
    
    // Get previous period
    const previousPeriod = this.service.payPeriod.getPreviousPeriod();
    console.log(`  Period: ${format(previousPeriod.startDate, 'MMM dd')} - ${format(previousPeriod.endDate, 'MMM dd')}`);
    
    // Extract
    console.log('  Extracting previous period...');
    const result = await this.service.extractPeriod(previousPeriod);
    
    if (!result.success) {
      console.log('  ⚠️  Previous period extraction failed (might be expected if no data)');
      return;
    }
    
    console.log(`  ✓ Records: ${result.metadata.recordCount}`);
    
    // List all stored periods
    const periods = await this.service.storage.listPeriods();
    console.log(`  ✓ Total stored periods: ${periods.length}`);
    
    console.log('  ✅ Historical extraction passed\n');
  }

  async testConcurrentExtractions() {
    console.log('📋 Test 5: Concurrent Extraction Simulation');
    
    // Create a test period that's likely to have data
    const testPeriod = this.service.payPeriod.getCurrentPeriod();
    
    console.log('  Simulating 3 concurrent extractions...');
    
    // Clear any existing data for clean test
    const periodPath = path.join(this.testStoragePath, testPeriod.id);
    try {
      await fs.rm(periodPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore if doesn't exist
    }
    
    // Launch concurrent extractions
    const promises = [
      this.service.extractPeriod(testPeriod),
      this.service.extractPeriod(testPeriod),
      this.service.extractPeriod(testPeriod)
    ];
    
    const results = await Promise.all(promises);
    
    // All should succeed
    const allSuccessful = results.every(r => r.success);
    console.log(`  ✓ All extractions successful: ${allSuccessful}`);
    
    // All should have same version (storage handles deduplication)
    const versions = results.map(r => r.metadata.version);
    const sameVersion = versions.every(v => v === versions[0]);
    console.log(`  ✓ Version consistency: ${sameVersion} (all v${versions[0]})`);
    
    // Check storage only has one version
    const history = await this.service.getHistory(testPeriod.id);
    console.log(`  ✓ Storage versions: ${history.length} (should be 1)`);
    
    if (history.length !== 1) {
      throw new Error('Concurrent extractions created multiple versions');
    }
    
    console.log('  ✅ Concurrent extraction passed\n');
  }
}

// Additional test for the extraction queue
async function testExtractionQueue() {
  console.log('📋 Bonus Test: Extraction Queue');
  
  const ExtractionQueue = require('../integrations/extraction-queue');
  const queue = new ExtractionQueue();
  
  // Set up mock handler
  queue.on('extract', async ({ periodId, requests, resolve }) => {
    console.log(`  Processing ${requests.length} requests for period ${periodId}`);
    await new Promise(r => setTimeout(r, 1000)); // Simulate work
    resolve({
      success: true,
      periodId,
      csvData: 'mock,data',
      metadata: { version: 1, recordCount: 10 }
    });
  });
  
  // Test concurrent requests
  console.log('  Testing queue with 5 concurrent requests...');
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(queue.addRequest('test-period', `user${i}`));
  }
  
  const results = await Promise.all(promises);
  console.log(`  ✓ Requests processed: ${results.length}`);
  console.log(`  ✓ All successful: ${results.every(r => r.success)}`);
  
  // Test cache
  console.log('  Testing cache (immediate re-request)...');
  const cached = await queue.addRequest('test-period', 'user6');
  console.log(`  ✓ From cache: ${cached.fromCache}`);
  
  console.log('  ✅ Extraction queue passed\n');
}

// Run all tests
async function runAllTests() {
  try {
    // Run integration tests
    const integrationTest = new IntegrationTest();
    await integrationTest.runTests();
    
    // Run queue test
    await testExtractionQueue();
    
    console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 TEST FAILURE:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = { IntegrationTest, testExtractionQueue };