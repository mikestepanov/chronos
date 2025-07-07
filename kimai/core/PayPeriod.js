const { addDays, startOfDay, endOfDay, format, differenceInDays } = require('date-fns');

/**
 * PayPeriod Calculator
 * Pure business logic for pay period calculations
 * No external dependencies or side effects
 */
class PayPeriod {
  constructor(config = {}) {
    this.startDate = new Date(config.startDate || '2024-01-01');
    this.periodDays = config.periodDays || 14;
  }

  /**
   * Get pay period information for a specific date
   * @param {Date} date - Date to check (defaults to now)
   * @returns {import('./types').PayPeriodInfo}
   */
  getPeriodForDate(date = new Date()) {
    const targetDate = startOfDay(date);
    const baseDate = startOfDay(this.startDate);
    
    const daysSinceStart = differenceInDays(targetDate, baseDate);
    const periodNumber = Math.floor(daysSinceStart / this.periodDays);
    const daysIntoPeriod = daysSinceStart % this.periodDays;
    
    const periodStart = addDays(baseDate, periodNumber * this.periodDays);
    const periodEnd = addDays(periodStart, this.periodDays - 1);
    
    return {
      startDate: periodStart,
      endDate: endOfDay(periodEnd),
      periodNumber: periodNumber + 1,
      daysElapsed: daysIntoPeriod + 1,
      id: format(periodStart, 'yyyy-MM-dd')
    };
  }

  /**
   * Get pay period by ID (start date in YYYY-MM-DD format)
   * @param {string} periodId 
   * @returns {import('./types').PayPeriodInfo}
   */
  getPeriodById(periodId) {
    const date = new Date(periodId);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid period ID: ${periodId}`);
    }
    return this.getPeriodForDate(date);
  }

  /**
   * Get pay period by number
   * @param {number} periodNumber - 1-based period number
   * @returns {import('./types').PayPeriodInfo}
   */
  getPeriodByNumber(periodNumber) {
    if (periodNumber < 1) {
      throw new Error('Period number must be >= 1');
    }
    
    const periodStart = addDays(this.startDate, (periodNumber - 1) * this.periodDays);
    return this.getPeriodForDate(periodStart);
  }

  /**
   * Get current pay period
   * @returns {import('./types').PayPeriodInfo}
   */
  getCurrentPeriod() {
    return this.getPeriodForDate(new Date());
  }

  /**
   * Get previous pay period
   * @param {number} count - How many periods back (default: 1)
   * @returns {import('./types').PayPeriodInfo}
   */
  getPreviousPeriod(count = 1) {
    const current = this.getCurrentPeriod();
    return this.getPeriodByNumber(current.periodNumber - count);
  }

  /**
   * Get next pay period
   * @param {number} count - How many periods forward (default: 1)
   * @returns {import('./types').PayPeriodInfo}
   */
  getNextPeriod(count = 1) {
    const current = this.getCurrentPeriod();
    return this.getPeriodByNumber(current.periodNumber + count);
  }

  /**
   * Check if a date is in the current pay period
   * @param {Date} date 
   * @returns {boolean}
   */
  isInCurrentPeriod(date) {
    const current = this.getCurrentPeriod();
    const check = this.getPeriodForDate(date);
    return current.id === check.id;
  }

  /**
   * Get all pay periods in a date range
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @returns {Array<import('./types').PayPeriodInfo>}
   */
  getPeriodsInRange(startDate, endDate) {
    const periods = [];
    let current = this.getPeriodForDate(startDate);
    const end = this.getPeriodForDate(endDate);
    
    while (current.periodNumber <= end.periodNumber) {
      periods.push(current);
      current = this.getPeriodByNumber(current.periodNumber + 1);
    }
    
    return periods;
  }

  /**
   * Calculate days until next period
   * @returns {number}
   */
  daysUntilNextPeriod() {
    const current = this.getCurrentPeriod();
    return this.periodDays - current.daysElapsed + 1;
  }
}

module.exports = PayPeriod;