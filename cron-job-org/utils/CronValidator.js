/**
 * CronValidator - Utility class for validating and explaining cron expressions
 */
class CronValidator {
  /**
   * Validate a cron expression
   * @param {string} expression - The cron expression to validate
   * @returns {Object} { valid: boolean, error?: string, explanation?: string }
   */
  static validate(expression) {
    if (!expression || typeof expression !== 'string') {
      return { valid: false, error: 'Cron expression must be a non-empty string' };
    }

    const parts = expression.trim().split(/\s+/);
    
    if (parts.length !== 5) {
      return { 
        valid: false, 
        error: `Expected 5 fields but got ${parts.length}. Format: "minute hour day month weekday"` 
      };
    }

    const fields = [
      { name: 'minute', min: 0, max: 59, value: parts[0] },
      { name: 'hour', min: 0, max: 23, value: parts[1] },
      { name: 'day', min: 1, max: 31, value: parts[2] },
      { name: 'month', min: 1, max: 12, value: parts[3] },
      { name: 'weekday', min: 0, max: 7, value: parts[4] } // 0 and 7 are Sunday
    ];

    for (const field of fields) {
      const validation = this._validateField(field);
      if (!validation.valid) {
        return { 
          valid: false, 
          error: `Invalid ${field.name}: ${validation.error}` 
        };
      }
    }

    return { 
      valid: true, 
      explanation: this.explain(expression) 
    };
  }

  /**
   * Explain what a cron expression does in human-readable format
   * @param {string} expression - The cron expression
   * @returns {string} Human-readable explanation
   */
  static explain(expression) {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return 'Invalid cron expression';

    const [minute, hour, day, month, weekday] = parts;
    
    let explanation = 'Runs ';

    // Time
    if (minute === '*' && hour === '*') {
      explanation += 'every minute';
    } else if (minute === '*') {
      explanation += `every minute of hour ${hour}`;
    } else if (hour === '*') {
      explanation += `at minute ${minute} of every hour`;
    } else {
      explanation += `at ${hour}:${minute.padStart(2, '0')}`;
    }

    // Day/Month
    if (day === '*' && month === '*') {
      // Check weekday
      if (weekday !== '*') {
        explanation += ` on ${this._getWeekdayName(weekday)}`;
      }
    } else if (day === '*') {
      explanation += ` in ${this._getMonthName(month)}`;
      if (weekday !== '*') {
        explanation += ` on ${this._getWeekdayName(weekday)}`;
      }
    } else if (month === '*') {
      explanation += ` on day ${day} of every month`;
      if (weekday !== '*') {
        explanation += ` if it's ${this._getWeekdayName(weekday)}`;
      }
    } else {
      explanation += ` on ${this._getMonthName(month)} ${day}`;
    }

    return explanation;
  }

  /**
   * Generate common cron expressions
   */
  static common = {
    everyMinute: () => '* * * * *',
    everyHour: () => '0 * * * *',
    everyDay: (hour = 0, minute = 0) => `${minute} ${hour} * * *`,
    everyWeek: (weekday = 1, hour = 0, minute = 0) => `${minute} ${hour} * * ${weekday}`,
    everyMonth: (day = 1, hour = 0, minute = 0) => `${minute} ${hour} ${day} * *`,
    everyYear: (month = 1, day = 1, hour = 0, minute = 0) => `${minute} ${hour} ${day} ${month} *`,
    
    // Specific patterns
    businessDays: (hour = 9, minute = 0) => `${minute} ${hour} * * 1-5`,
    weekends: (hour = 10, minute = 0) => `${minute} ${hour} * * 0,6`,
    
    // Monday reminders
    mondayMorning: (hour = 9, minute = 0) => `${minute} ${hour} * * 1`,
    
    // Multiple times
    twiceDaily: (hours = [9, 17], minute = 0) => `${minute} ${hours.join(',')} * * *`,
    
    // Every N units
    everyNMinutes: (n) => `*/${n} * * * *`,
    everyNHours: (n) => `0 */${n} * * *`,
  };

  /**
   * Convert between cron expression and cron-job.org schedule object
   * @param {string} expression - Cron expression
   * @returns {Object} Schedule object for cron-job.org API
   */
  static toScheduleObject(expression) {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression');
    }

    const [minutes, hours, days, months, weekdays] = parts;
    
    return {
      minutes: this._parseFieldToArray(minutes, 0, 59),
      hours: this._parseFieldToArray(hours, 0, 23),
      mdays: this._parseFieldToArray(days, 1, 31),
      months: this._parseFieldToArray(months, 1, 12),
      wdays: this._parseFieldToArray(weekdays, 0, 7)
    };
  }

  // Private helper methods

  static _validateField(field) {
    const { value, min, max } = field;

    // Handle wildcards
    if (value === '*') return { valid: true };

    // Handle ranges (e.g., 1-5)
    if (value.includes('-')) {
      const [start, end] = value.split('-').map(Number);
      if (isNaN(start) || isNaN(end)) {
        return { valid: false, error: 'Invalid range format' };
      }
      if (start < min || end > max || start > end) {
        return { valid: false, error: `Range ${start}-${end} is outside valid range ${min}-${max}` };
      }
      return { valid: true };
    }

    // Handle steps (e.g., */5)
    if (value.includes('/')) {
      const [range, step] = value.split('/');
      const stepNum = Number(step);
      if (isNaN(stepNum) || stepNum <= 0) {
        return { valid: false, error: 'Invalid step value' };
      }
      if (range !== '*' && !range.includes('-')) {
        return { valid: false, error: 'Step can only be used with * or range' };
      }
      return { valid: true };
    }

    // Handle lists (e.g., 1,3,5)
    if (value.includes(',')) {
      const values = value.split(',');
      for (const v of values) {
        const num = Number(v);
        if (isNaN(num) || num < min || num > max) {
          return { valid: false, error: `Value ${v} is outside valid range ${min}-${max}` };
        }
      }
      return { valid: true };
    }

    // Single value
    const num = Number(value);
    if (isNaN(num)) {
      return { valid: false, error: 'Must be a number or valid cron syntax' };
    }
    if (num < min || num > max) {
      return { valid: false, error: `Value ${num} is outside valid range ${min}-${max}` };
    }

    return { valid: true };
  }

  static _parseFieldToArray(field, min, max) {
    if (field === '*') return [];

    const values = [];

    // Handle ranges
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(Number);
      for (let i = start; i <= end && i <= max; i++) {
        if (i >= min) values.push(i);
      }
    }
    // Handle lists
    else if (field.includes(',')) {
      field.split(',').forEach(val => {
        const num = Number(val);
        if (num >= min && num <= max) values.push(num);
      });
    }
    // Handle steps
    else if (field.includes('/')) {
      const [range, step] = field.split('/');
      const stepNum = Number(step);
      const start = range === '*' ? min : Number(range);
      
      for (let i = start; i <= max; i += stepNum) {
        if (i >= min) values.push(i);
      }
    }
    // Single value
    else {
      const num = Number(field);
      if (num >= min && num <= max) values.push(num);
    }

    return values.sort((a, b) => a - b);
  }

  static _getWeekdayName(value) {
    const days = {
      '0': 'Sunday',
      '1': 'Monday',
      '2': 'Tuesday',
      '3': 'Wednesday',
      '4': 'Thursday',
      '5': 'Friday',
      '6': 'Saturday',
      '7': 'Sunday'
    };

    if (value.includes(',')) {
      return value.split(',').map(d => days[d] || d).join(', ');
    }
    if (value.includes('-')) {
      const [start, end] = value.split('-');
      return `${days[start] || start} through ${days[end] || end}`;
    }
    
    return days[value] || value;
  }

  static _getMonthName(value) {
    const months = {
      '1': 'January', '2': 'February', '3': 'March', '4': 'April',
      '5': 'May', '6': 'June', '7': 'July', '8': 'August',
      '9': 'September', '10': 'October', '11': 'November', '12': 'December'
    };

    if (value.includes(',')) {
      return value.split(',').map(m => months[m] || m).join(', ');
    }
    
    return months[value] || value;
  }
}

module.exports = CronValidator;