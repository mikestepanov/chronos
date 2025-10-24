/**
 * DateHelper - Centralized date formatting and manipulation utilities
 * 
 * Provides consistent date operations throughout the application,
 * reducing duplication and ensuring uniform date handling.
 */

const { 
  format, 
  addDays, 
  subDays,
  addHours,
  subHours,
  addMinutes,
  startOfDay, 
  endOfDay,
  differenceInDays,
  isSameDay,
  setHours,
  setMinutes,
  isAfter,
  isBefore
} = require('date-fns');

class DateHelper {
  /**
   * Common date format patterns used throughout the application
   */
  static FORMATS = {
    // Display formats
    SHORT_DATE: 'MMM d',              // Jan 15
    SHORT_DATE_SLASH: 'M/d',          // 1/15
    FULL_DATE: 'MMM dd, yyyy',        // Jan 15, 2025
    FULL_DATE_WEEKDAY: 'EEEE, MMMM d', // Monday, January 15
    MONTH_DAY_ORDINAL: 'MMMM do',     // January 15th
    
    // Technical formats
    ISO_DATE: 'yyyy-MM-dd',           // 2025-01-15
    ISO_DATETIME: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", // 2025-01-15T14:30:00.000Z
    FILE_DATE: 'yyyy-MM-dd',          // For filenames
    
    // Time formats
    TIME_12H: 'h:mm a',               // 2:30 PM
    TIME_24H: 'HH:mm',                // 14:30
    
    // Component formats
    WEEKDAY: 'EEEE',                  // Monday
    MONTH_FULL: 'MMMM',               // January
    YEAR: 'yyyy',                     // 2025
  };

  /**
   * Format a date range in the standard format
   * @param {Date} start - Start date
   * @param {Date} end - End date
   * @param {string} separator - Separator string (default: ' - ')
   * @returns {string} Formatted range like "Jan 15 - Jan 28"
   */
  static formatPeriodRange(start, end, separator = ' - ') {
    return `${format(start, this.FORMATS.SHORT_DATE)}${separator}${format(end, this.FORMATS.SHORT_DATE)}`;
  }

  /**
   * Format a date range in EST timezone
   * @param {Date} start - Start date
   * @param {Date} end - End date
   * @param {string} separator - Separator string (default: ' - ')
   * @returns {string} Formatted range like "Jan 15 - Jan 28" in EST
   */
  static formatPeriodRangeInEST(start, end, separator = ' - ') {
    const startParts = this.getDatePartsEST(start);
    const endParts = this.getDatePartsEST(end);

    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startStr = `${months[startParts.month]} ${startParts.day}`;
    const endStr = `${months[endParts.month]} ${endParts.day}`;

    return `${startStr}${separator}${endStr}`;
  }

  /**
   * Format a date range with slash notation
   * @param {Date} start - Start date
   * @param {Date} end - End date
   * @returns {string} Formatted range like "1/15 - 1/28"
   */
  static formatPeriodRangeSlash(start, end) {
    return `${format(start, this.FORMATS.SHORT_DATE_SLASH)} - ${format(end, this.FORMATS.SHORT_DATE_SLASH)}`;
  }

  /**
   * Format time in 12-hour format
   * @param {Date} date - Date to format
   * @returns {string} Time like "2:30 PM"
   */
  static formatTime(date) {
    return format(date, this.FORMATS.TIME_12H);
  }

  /**
   * Generic format method for custom formats
   * @param {Date} date - Date to format
   * @param {string} formatString - Format string or FORMATS key
   * @returns {string} Formatted date
   */
  static format(date, formatString) {
    return format(date, formatString);
  }

  /**
   * Format date in ISO format (for IDs and technical use)
   * @param {Date} date - Date to format
   * @returns {string} Date like "2025-01-15"
   */
  static formatISO(date) {
    return format(date, this.FORMATS.ISO_DATE);
  }

  /**
   * Format date in ISO format using EST timezone
   * @param {Date} date - Date to format
   * @returns {string} Date like "2025-01-15" in EST
   */
  static formatISOInEST(date) {
    const parts = this.getDatePartsEST(date);
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  }

  /**
   * Format date for display with weekday
   * @param {Date} date - Date to format
   * @returns {string} Date like "Monday, January 15"
   */
  static formatFullWithWeekday(date) {
    return format(date, this.FORMATS.FULL_DATE_WEEKDAY);
  }

  /**
   * Get start of day (00:00:00.000)
   * @param {Date} date - Input date
   * @returns {Date} Start of day
   */
  static getStartOfDay(date) {
    return startOfDay(date);
  }

  /**
   * Get end of day (23:59:59.999)
   * @param {Date} date - Input date
   * @returns {Date} End of day
   */
  static getEndOfDay(date) {
    return endOfDay(date);
  }

  /**
   * Add days to a date
   * @param {Date} date - Base date
   * @param {number} days - Days to add
   * @returns {Date} New date
   */
  static addDays(date, days) {
    return addDays(date, days);
  }

  /**
   * Subtract days from a date
   * @param {Date} date - Base date
   * @param {number} days - Days to subtract
   * @returns {Date} New date
   */
  static subDays(date, days) {
    return subDays(date, days);
  }

  /**
   * Add hours to a date
   * @param {Date} date - Base date
   * @param {number} hours - Hours to add
   * @returns {Date} New date
   */
  static addHours(date, hours) {
    return addHours(date, hours);
  }

  /**
   * Subtract hours from a date
   * @param {Date} date - Base date
   * @param {number} hours - Hours to subtract
   * @returns {Date} New date
   */
  static subHours(date, hours) {
    return subHours(date, hours);
  }

  /**
   * Add minutes to a date
   * @param {Date} date - Base date
   * @param {number} minutes - Minutes to add
   * @returns {Date} New date
   */
  static addMinutes(date, minutes) {
    return addMinutes(date, minutes);
  }

  /**
   * Calculate pay period dates
   * @param {Date} baseDate - Base period end date
   * @param {number} periodNumber - Period number
   * @param {number} periodDays - Days per period (default: 14)
   * @returns {Object} Object with start and end dates
   */
  static calculatePeriodDates(baseDate, periodNumber, periodDays = 14) {
    const daysSinceBase = periodNumber * periodDays;
    const periodEnd = addDays(baseDate, daysSinceBase);
    const periodStart = subDays(periodEnd, periodDays - 1);
    
    return {
      start: periodStart,
      end: periodEnd
    };
  }

  /**
   * Get number of days between two dates
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {number} Days between (absolute value)
   */
  static getDaysBetween(date1, date2) {
    return Math.abs(differenceInDays(date1, date2));
  }

  /**
   * Check if two dates are the same day
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {boolean} True if same day
   */
  static isSameDay(date1, date2) {
    return isSameDay(date1, date2);
  }

  /**
   * Set specific time on a date
   * @param {Date} date - Base date
   * @param {number} hours - Hours (0-23)
   * @param {number} minutes - Minutes (0-59)
   * @returns {Date} New date with specified time
   */
  static setTime(date, hours, minutes = 0) {
    return setMinutes(setHours(date, hours), minutes);
  }

  /**
   * Calculate notification time (advance notice)
   * @param {Date} targetTime - When the event happens
   * @param {number} advanceHours - Hours of advance notice
   * @returns {Date} When to send notification
   */
  static calculateNotificationTime(targetTime, advanceHours) {
    return subHours(targetTime, advanceHours);
  }

  /**
   * Format duration in hours and minutes
   * @param {number} hours - Total hours (can be decimal)
   * @returns {string} Formatted like "8h 30m"
   */
  static formatDuration(hours) {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (minutes === 0) {
      return `${wholeHours}h`;
    }
    return `${wholeHours}h ${minutes}m`;
  }

  /**
   * Get a date at noon (12:00) - useful for date comparisons to avoid timezone issues
   * @param {Date} date - Input date
   * @returns {Date} Date at noon
   */
  static getDateAtNoon(date) {
    return setHours(setMinutes(date, 0), 12);
  }

  /**
   * Check if date is in the future
   * @param {Date} date - Date to check
   * @returns {boolean} True if in future
   */
  static isFuture(date) {
    return isAfter(date, new Date());
  }

  /**
   * Check if date is in the past
   * @param {Date} date - Date to check
   * @returns {boolean} True if in past
   */
  static isPast(date) {
    return isBefore(date, new Date());
  }

  /**
   * Format relative time for scheduling (e.g., "in 2 hours")
   * @param {Date} futureDate - Future date
   * @returns {string} Relative time string
   */
  static formatRelativeTime(futureDate) {
    const now = new Date();
    const diffMs = futureDate - now;
    
    if (diffMs < 0) return 'in the past';
    
    const diffMins = Math.round(diffMs / 1000 / 60);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);
    
    if (diffMins < 60) return `in ${diffMins} minutes`;
    if (diffHours < 24) return `in ${diffHours} hours`;
    return `in ${diffDays} days`;
  }

  /**
   * Create a timezone-safe date for comparisons
   * @param {string} dateString - Date string like "2025-01-15"
   * @returns {Date} Date object at UTC midnight
   */
  static createUTCDate(dateString) {
    return new Date(dateString + 'T00:00:00.000Z');
  }

  /**
   * Get start of day in America/New_York timezone (EST/EDT)
   * This is used for Kimai operations which are timezone-aware
   * @param {Date} date - Input date
   * @returns {Date} Start of day in EST (00:00:00 EST)
   */
  static getStartOfDayEST(date) {
    // Get the date components in EST timezone
    const year = date.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric' });
    const month = date.toLocaleString('en-US', { timeZone: 'America/New_York', month: '2-digit' });
    const day = date.toLocaleString('en-US', { timeZone: 'America/New_York', day: '2-digit' });

    // Create ISO string for midnight EST
    // America/New_York is UTC-5 (EST) or UTC-4 (EDT)
    const dateStr = `${year}-${month}-${day}`;

    // Parse as if it's midnight in EST
    // We need to figure out the UTC offset for this specific date
    const testDate = new Date(`${dateStr}T12:00:00`);
    const estOffset = testDate.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      timeZoneName: 'short'
    }).includes('EDT') ? 4 : 5; // EDT = UTC-4, EST = UTC-5

    // Create UTC timestamp for midnight EST
    const utcHour = estOffset;
    return new Date(`${dateStr}T${String(utcHour).padStart(2, '0')}:00:00.000Z`);
  }

  /**
   * Get end of day in America/New_York timezone (EST/EDT)
   * This is used for Kimai operations which are timezone-aware
   * @param {Date} date - Input date
   * @returns {Date} End of day in EST (23:59:59.999 EST)
   */
  static getEndOfDayEST(date) {
    // Get the date components in EST timezone
    const year = date.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric' });
    const month = date.toLocaleString('en-US', { timeZone: 'America/New_York', month: '2-digit' });
    const day = date.toLocaleString('en-US', { timeZone: 'America/New_York', day: '2-digit' });

    const dateStr = `${year}-${month}-${day}`;

    // Figure out if this date is in EDT or EST
    const testDate = new Date(`${dateStr}T12:00:00`);
    const estOffset = testDate.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      timeZoneName: 'short'
    }).includes('EDT') ? 4 : 5;

    // End of day is 23:59:59.999 EST
    // In UTC, that's (estOffset + 23):59:59.999, but we need next day if >= 24
    const utcHour = estOffset + 23;

    if (utcHour >= 24) {
      // Rolls over to next day
      const nextDay = new Date(dateStr);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      const nextUtcHour = utcHour - 24;
      return new Date(`${nextDayStr}T${String(nextUtcHour).padStart(2, '0')}:59:59.999Z`);
    } else {
      return new Date(`${dateStr}T${String(utcHour).padStart(2, '0')}:59:59.999Z`);
    }
  }

  /**
   * Get date parts in EST timezone
   * @param {Date} date - Input date
   * @returns {Object} Object with year, month (1-12), day
   */
  static getDatePartsEST(date) {
    const year = parseInt(date.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric' }));
    const month = parseInt(date.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'numeric' }));
    const day = parseInt(date.toLocaleString('en-US', { timeZone: 'America/New_York', day: 'numeric' }));

    return { year, month, day };
  }
}

module.exports = DateHelper;