/**
 * Core type definitions for Kimai system
 * No external dependencies - pure JavaScript
 */

/**
 * @typedef {Object} PayPeriodInfo
 * @property {Date} startDate - Start of pay period
 * @property {Date} endDate - End of pay period  
 * @property {number} periodNumber - Sequential period number
 * @property {number} daysElapsed - Days elapsed in current period
 * @property {string} id - Unique identifier (YYYY-MM-DD format of start date)
 */

/**
 * @typedef {Object} ExtractionResult
 * @property {boolean} success
 * @property {string} periodId
 * @property {string} csvData - Raw CSV content
 * @property {Object} metadata
 * @property {Date} metadata.extractedAt
 * @property {number} metadata.version
 * @property {number} metadata.recordCount
 * @property {string} metadata.checksum
 * @property {Error} [error]
 */

/**
 * @typedef {Object} StorageEntry
 * @property {string} periodId
 * @property {number} version
 * @property {Date} extractedAt
 * @property {string} csvPath
 * @property {Object} metadata
 * @property {string} checksum
 */

/**
 * @typedef {Object} DiffResult
 * @property {string} periodId
 * @property {number} version1
 * @property {number} version2
 * @property {boolean} hasChanges
 * @property {Array<string>} addedRecords
 * @property {Array<string>} removedRecords
 * @property {Array<string>} modifiedRecords
 */

module.exports = {
  // Type definitions are JSDoc only
};