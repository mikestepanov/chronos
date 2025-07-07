const { getConfig } = require('./config');
const PayPeriod = require('./core/PayPeriod');
const KimaiAPI = require('./services/KimaiAPI');
const StorageFactory = require('./storage/StorageFactory');

/**
 * Kimai Extraction Service
 * Orchestrates the extraction process using injected dependencies
 */
class KimaiExtractionService {
  constructor(dependencies = {}) {
    const config = getConfig();
    
    // Initialize dependencies with defaults
    this.payPeriod = dependencies.payPeriod || new PayPeriod(config.payPeriod);
    this.kimaiAPI = dependencies.kimaiAPI || new KimaiAPI(config.kimai);
    this.storage = dependencies.storage || StorageFactory.create(config);
    this.config = config;
    
    this.logger = dependencies.logger || console;
  }

  /**
   * Extract timesheet for current pay period
   * @returns {Promise<import('./core/types').ExtractionResult>}
   */
  async extractCurrent() {
    const period = this.payPeriod.getCurrentPeriod();
    return this.extractPeriod(period);
  }

  /**
   * Extract timesheet for a specific pay period
   * @param {import('./core/types').PayPeriodInfo|string} periodOrId 
   * @returns {Promise<import('./core/types').ExtractionResult>}
   */
  async extractPeriod(periodOrId) {
    try {
      // Handle both PayPeriodInfo object and periodId string
      const period = typeof periodOrId === 'string' 
        ? this.payPeriod.getPeriodById(periodOrId)
        : periodOrId;

      this.logger.info(`Extracting timesheets for period ${period.id} (${period.periodNumber})`);

      // Extract CSV from Kimai
      const csvData = await this.kimaiAPI.exportCSV(period.startDate, period.endDate);
      
      if (!csvData || csvData.trim().length === 0) {
        throw new Error('No CSV data received from Kimai');
      }

      // Save to storage (handles versioning)
      const storageEntry = await this.storage.save(period.id, csvData, {
        periodNumber: period.periodNumber,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        extractedBy: 'KimaiExtractionService'
      });

      this.logger.info(`Saved period ${period.id} as version ${storageEntry.version}`);

      return {
        success: true,
        periodId: period.id,
        csvData,
        metadata: {
          extractedAt: storageEntry.extractedAt,
          version: storageEntry.version,
          recordCount: storageEntry.metadata.recordCount,
          checksum: storageEntry.checksum
        }
      };
    } catch (error) {
      this.logger.error(`Extraction failed: ${error.message}`);
      return {
        success: false,
        periodId: typeof periodOrId === 'string' ? periodOrId : periodOrId.id,
        csvData: null,
        metadata: null,
        error
      };
    }
  }

  /**
   * Re-extract a period and check for changes
   * @param {string} periodId 
   * @returns {Promise<{result: import('./core/types').ExtractionResult, changes: import('./core/types').DiffResult|null}>}
   */
  async reExtractAndCompare(periodId) {
    // Get current version before extraction
    const latestBefore = await this.storage.getLatest(periodId);
    const versionBefore = latestBefore ? latestBefore.version : 0;

    // Extract new data
    const result = await this.extractPeriod(periodId);
    
    if (!result.success) {
      return { result, changes: null };
    }

    // Check if version changed
    if (result.metadata.version === versionBefore) {
      this.logger.info(`No changes detected for period ${periodId}`);
      return { result, changes: null };
    }

    // Compare versions
    const changes = await this.storage.compareVersions(
      periodId, 
      versionBefore, 
      result.metadata.version
    );

    this.logger.info(`Changes detected for period ${periodId}: ${changes.addedRecords.length} added, ${changes.removedRecords.length} removed`);

    return { result, changes };
  }

  /**
   * Extract multiple periods
   * @param {Array<string>} periodIds 
   * @returns {Promise<Array<import('./core/types').ExtractionResult>>}
   */
  async extractMultiple(periodIds) {
    const results = [];
    
    for (const periodId of periodIds) {
      const result = await this.extractPeriod(periodId);
      results.push(result);
      
      // Add delay between requests to avoid overwhelming the API
      if (periodIds.indexOf(periodId) < periodIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Get extraction history for a period
   * @param {string} periodId 
   * @returns {Promise<Array<import('./core/types').StorageEntry>>}
   */
  async getHistory(periodId) {
    return this.storage.getAllVersions(periodId);
  }

  /**
   * Get CSV data for a specific version
   * @param {string} periodId 
   * @param {number} version 
   * @returns {Promise<string|null>}
   */
  async getCSV(periodId, version) {
    return this.storage.getCSV(periodId, version);
  }

  /**
   * Check if extraction is needed based on configuration
   * @returns {boolean}
   */
  shouldExtractToday() {
    const period = this.payPeriod.getCurrentPeriod();
    return period.daysElapsed >= this.config.extraction.extractAfterDays;
  }

  /**
   * Get extraction status
   * @returns {Promise<Object>}
   */
  async getStatus() {
    const currentPeriod = this.payPeriod.getCurrentPeriod();
    const hasData = await this.storage.hasPeriod(currentPeriod.id);
    const latest = hasData ? await this.storage.getLatest(currentPeriod.id) : null;
    
    return {
      currentPeriod: {
        ...currentPeriod,
        extractionDue: this.shouldExtractToday()
      },
      lastExtraction: latest ? {
        version: latest.version,
        extractedAt: latest.extractedAt,
        recordCount: latest.metadata.recordCount
      } : null,
      storedPeriods: await this.storage.listPeriods()
    };
  }
}

module.exports = KimaiExtractionService;