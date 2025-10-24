/**
 * TimesheetProcessor - Processes raw CSV data into structured timesheet entries
 * 
 * This service is responsible for:
 * - Parsing CSV data
 * - Filtering entries by date range
 * - Mapping users to internal identifiers
 * - Calculating hours and compliance
 */

const { parse } = require('csv-parse/sync');

class TimesheetProcessor {
  constructor(config) {
    this.config = config;
    this.users = config.users;
  }

  /**
   * Process CSV data for a specific pay period
   * @param {string} csvData - Raw CSV data from Kimai
   * @param {Object} payPeriod - Pay period with start/end dates
   * @returns {Object} Processed timesheet data
   */
  processCSV(csvData, payPeriod) {
    // Parse CSV
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true
    });

    // Filter and transform records
    const timesheets = this.filterAndTransform(records, payPeriod);
    
    // Calculate statistics
    const stats = this.calculateStats(records, timesheets, payPeriod);
    
    return {
      timesheets,
      stats,
      payPeriod
    };
  }

  /**
   * Filter records by pay period and transform to internal format
   */
  filterAndTransform(records, payPeriod) {
    return records
      .filter(record => this.isInPayPeriod(record, payPeriod))
      .map(record => this.transformRecord(record));
  }

  /**
   * Check if record is within pay period
   * Uses EST timezone to match Kimai's timezone
   */
  isInPayPeriod(record, payPeriod) {
    if (!record.Date || !/^\d{4}-\d{2}-\d{2}$/.test(record.Date)) {
      return false;
    }

    const DateHelper = require('../../shared/date-helper');

    // Extract calendar dates from record (Kimai exports in EST)
    const recordYear = parseInt(record.Date.substring(0, 4));
    const recordMonth = parseInt(record.Date.substring(5, 7)); // 1-indexed
    const recordDay = parseInt(record.Date.substring(8, 10));

    // Get pay period dates in EST timezone (not local timezone!)
    const startParts = DateHelper.getDatePartsEST(payPeriod.start);
    const endParts = DateHelper.getDatePartsEST(payPeriod.end);

    // Compare as YYYYMMDD integers for simplicity
    const recordYYYYMMDD = recordYear * 10000 + recordMonth * 100 + recordDay;
    const startYYYYMMDD = startParts.year * 10000 + startParts.month * 100 + startParts.day;
    const endYYYYMMDD = endParts.year * 10000 + endParts.month * 100 + endParts.day;

    return recordYYYYMMDD >= startYYYYMMDD && recordYYYYMMDD <= endYYYYMMDD;
  }

  /**
   * Transform CSV record to internal timesheet format
   */
  transformRecord(record) {
    // Parse duration
    const durationParts = (record.Duration || '0:00').split(':');
    const hours = parseInt(durationParts[0] || 0);
    const minutes = parseInt(durationParts[1] || 0);
    const durationSeconds = (hours * 3600) + (minutes * 60);
    
    // Map user
    const mappedUser = this.mapUser(record.User);
    
    return {
      user: mappedUser,
      duration: durationSeconds,
      date: record.Date,
      project: record.Project,
      activity: record.Activity,
      description: record.Description,
      billable: record.Billable === '1',
      originalUser: record.User
    };
  }

  /**
   * Map CSV user to internal user identifier
   */
  mapUser(csvUser) {
    if (!csvUser) return csvUser;
    
    const csvUserLower = csvUser.toLowerCase();
    const user = this.users.users.find(u => 
      u.services?.kimai?.username?.toLowerCase() === csvUserLower ||
      u.name?.toLowerCase() === csvUserLower
    );
    
    return user?.services?.kimai?.username || csvUser;
  }

  /**
   * Calculate statistics about the processed data
   */
  calculateStats(allRecords, filteredTimesheets, payPeriod) {
    const totalRecords = allRecords.length;
    const filteredRecords = filteredTimesheets.length;
    
    // Count unique users
    const uniqueUsers = new Set(filteredTimesheets.map(t => t.user)).size;
    
    // Total hours
    const totalHours = filteredTimesheets.reduce((sum, t) => sum + (t.duration / 3600), 0);
    
    return {
      totalRecords,
      filteredRecords,
      uniqueUsers,
      totalHours,
      recordsOutsidePeriod: totalRecords - filteredRecords,
      periodNumber: payPeriod.number,
      dateRange: {
        start: payPeriod.start.toISOString().split('T')[0],
        end: payPeriod.end.toISOString().split('T')[0]
      }
    };
  }
}

module.exports = TimesheetProcessor;