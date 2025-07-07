/**
 * Storage Interface
 * Defines the contract for storage implementations
 */
class Storage {
  /**
   * Save CSV data for a pay period
   * @param {string} periodId - Pay period identifier
   * @param {string} csvData - Raw CSV content
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<import('../core/types').StorageEntry>}
   */
  async save(periodId, csvData, metadata = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Get latest version for a pay period
   * @param {string} periodId 
   * @returns {Promise<import('../core/types').StorageEntry|null>}
   */
  async getLatest(periodId) {
    throw new Error('Not implemented');
  }

  /**
   * Get specific version for a pay period
   * @param {string} periodId 
   * @param {number} version 
   * @returns {Promise<import('../core/types').StorageEntry|null>}
   */
  async getVersion(periodId, version) {
    throw new Error('Not implemented');
  }

  /**
   * Get all versions for a pay period
   * @param {string} periodId 
   * @returns {Promise<Array<import('../core/types').StorageEntry>>}
   */
  async getAllVersions(periodId) {
    throw new Error('Not implemented');
  }

  /**
   * Get CSV data for a specific version
   * @param {string} periodId 
   * @param {number} version 
   * @returns {Promise<string|null>}
   */
  async getCSV(periodId, version) {
    throw new Error('Not implemented');
  }

  /**
   * List all stored periods
   * @returns {Promise<Array<string>>}
   */
  async listPeriods() {
    throw new Error('Not implemented');
  }

  /**
   * Check if period has any data
   * @param {string} periodId 
   * @returns {Promise<boolean>}
   */
  async hasPeriod(periodId) {
    throw new Error('Not implemented');
  }

  /**
   * Compare two versions
   * @param {string} periodId 
   * @param {number} version1 
   * @param {number} version2 
   * @returns {Promise<import('../core/types').DiffResult>}
   */
  async compareVersions(periodId, version1, version2) {
    throw new Error('Not implemented');
  }
}

module.exports = Storage;