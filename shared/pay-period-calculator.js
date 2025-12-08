const DateHelper = require('./date-helper');

class PayPeriodCalculator {
  constructor(config = {}) {
    // Base reference point for calculations
    this.basePeriodNumber = config.basePeriodNumber || 18;
    // Use EST/EDT timezone (America/New_York) to match Kimai
    // June 23, 2025 is a Monday (end of period 18)
    // June 23, 2025 23:59:59.999 EDT = June 24, 2025 03:59:59.999 UTC
    this.basePeriodEndDate = config.basePeriodEndDate || new Date('2025-06-24T03:59:59.999Z');
    this.periodLengthDays = config.periodLengthDays || 14;
    this.paymentDelayDays = config.paymentDelayDays || 7; // Payment the following Monday

    // All Kimai operations use America/New_York timezone
    this.timezone = 'America/New_York';
  }

  getCurrentPeriodInfo(referenceDate = new Date()) {
    // Calculate how many days have passed since the base period end date
    // Use EST timezone to match Kimai
    const refDay = DateHelper.getStartOfDayEST(referenceDate);
    const baseDay = DateHelper.getStartOfDayEST(this.basePeriodEndDate);
    const daysSinceBase = Math.floor((refDay - baseDay) / (1000 * 60 * 60 * 24));

    // If reference date is before or on base period end date, we're in the base period
    let periodsPassed = 0;
    if (daysSinceBase > 0) {
      // We've moved past the base period, calculate how many full periods
      periodsPassed = Math.floor((daysSinceBase - 1) / this.periodLengthDays) + 1;
    }

    // Calculate current period number
    const currentPeriodNumber = this.basePeriodNumber + periodsPassed;

    // Calculate current period dates
    const currentPeriodEnd = DateHelper.addDays(this.basePeriodEndDate, periodsPassed * this.periodLengthDays);
    const currentPeriodStart = DateHelper.addDays(currentPeriodEnd, -(this.periodLengthDays - 1));

    // Calculate next period info
    const nextPeriodNumber = currentPeriodNumber + 1;
    const nextPeriodStart = DateHelper.addDays(currentPeriodEnd, 1);
    const nextPeriodEnd = DateHelper.addDays(currentPeriodEnd, this.periodLengthDays);

    // Calculate payment date
    const paymentDate = DateHelper.addDays(currentPeriodEnd, this.paymentDelayDays);

    return {
      currentPeriod: {
        number: currentPeriodNumber,
        startDate: DateHelper.getStartOfDayEST(currentPeriodStart),
        endDate: DateHelper.getEndOfDayEST(currentPeriodEnd), // Include full last day (23:59:59 EST)
        paymentDate: DateHelper.getStartOfDayEST(paymentDate)
      },
      nextPeriod: {
        number: nextPeriodNumber,
        startDate: DateHelper.getStartOfDayEST(nextPeriodStart),
        endDate: DateHelper.getEndOfDayEST(nextPeriodEnd) // Include full last day (23:59:59 EST)
      }
    };
  }

  formatDate(date, formatString = 'M/d') {
    return DateHelper.format(date, formatString);
  }

  formatDateLong(date) {
    return DateHelper.format(date, DateHelper.FORMATS.MONTH_DAY_ORDINAL);
  }

  formatDateFull(date) {
    return DateHelper.format(date, 'MMMM do, yyyy');
  }

  getOrdinal(number) {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = number % 100;
    return number + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }

  generateReminderMessage(options = {}) {
    const { 
      referenceDate = new Date(),
      includeExtraHours = true,
      teamName = 'Team'
    } = options;

    const periodInfo = this.getCurrentPeriodInfo(referenceDate);
    const { currentPeriod, nextPeriod } = periodInfo;

    const periodOrdinal = this.getOrdinal(currentPeriod.number);
    const todayFormatted = this.formatDateLong(currentPeriod.endDate);
    const startFormatted = this.formatDate(currentPeriod.startDate);
    const endFormatted = this.formatDate(currentPeriod.endDate);
    const paymentDateFormatted = this.formatDateLong(currentPeriod.paymentDate);
    const tomorrowFormatted = this.formatDateLong(nextPeriod.startDate);

    let message = `Good Morning ${teamName},

A Quick Reminder: The ${periodOrdinal} pay-period is fast approaching!

Please begin to input your timesheet data today (${todayFormatted}) end of day. Please note that this paycheck will account for the full 2 weeks. This ${periodOrdinal} payroll period will include the dates from ${startFormatted} – ${endFormatted}. (Meaning that today (${todayFormatted}) is also counted for the ${periodOrdinal} pay-period, TOMORROW (${tomorrowFormatted}) is counted for the ${this.getOrdinal(nextPeriod.number)} pay-period.)`;

    if (includeExtraHours) {
      message += `\n\nFor those of you that have been given extra hours, please ensure to input them into your timesheet for this pay-period as well.`;
    }

    message += `\n\nPlease expect the payment to go through on the ${paymentDateFormatted}.

If you have any questions or concerns, please do not hesitate to reach out to Mikhail.

Thank you.

@here`;

    return message;
  }

  generateBotFormattedMessage(botIdentity, options = {}) {
    const periodInfo = this.getCurrentPeriodInfo(options.referenceDate);
    const { currentPeriod, nextPeriod } = periodInfo;

    return {
      periodNumber: currentPeriod.number,
      periodOrdinal: this.getOrdinal(currentPeriod.number),
      startDate: this.formatDate(currentPeriod.startDate),
      endDate: this.formatDate(currentPeriod.endDate),
      endDateLong: this.formatDateLong(currentPeriod.endDate),
      paymentDate: this.formatDateLong(currentPeriod.paymentDate),
      nextPeriodNumber: nextPeriod.number,
      nextPeriodOrdinal: this.getOrdinal(nextPeriod.number),
      tomorrowDate: this.formatDateLong(nextPeriod.startDate),
      daysRemaining: 0 // Since this is for end-of-period reminder
    };
  }

  // Check if today is the last day of a pay period (EST timezone)
  isLastDayOfPeriod(date = new Date()) {
    const periodInfo = this.getCurrentPeriodInfo(date);
    const today = DateHelper.getStartOfDayEST(date);
    const periodEnd = DateHelper.getStartOfDayEST(periodInfo.currentPeriod.endDate);

    return today.getTime() === periodEnd.getTime();
  }

  // Get days until period end (EST timezone)
  getDaysUntilPeriodEnd(date = new Date()) {
    const periodInfo = this.getCurrentPeriodInfo(date);
    const today = DateHelper.getStartOfDayEST(date);
    const periodEnd = DateHelper.getStartOfDayEST(periodInfo.currentPeriod.endDate);

    const diffTime = periodEnd.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  // Get current pay period (simplified format for services)
  getCurrentPayPeriod(date = new Date()) {
    const periodInfo = this.getCurrentPeriodInfo(date);
    const { currentPeriod } = periodInfo;
    
    return {
      id: `${currentPeriod.startDate.getFullYear()}-${currentPeriod.number}`,
      number: currentPeriod.number,
      start: currentPeriod.startDate,
      end: currentPeriod.endDate,
      paymentDate: currentPeriod.paymentDate
    };
  }
}

module.exports = PayPeriodCalculator;