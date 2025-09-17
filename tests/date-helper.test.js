const DateHelper = require('../shared/date-helper');

describe('DateHelper', () => {
  // Use fixed dates to avoid timezone issues
  const testDate = new Date('2025-01-15T14:30:00.000Z');
  const testDate2 = new Date('2025-01-28T18:45:00.000Z');

  describe('FORMATS', () => {
    test('should have all expected format constants', () => {
      expect(DateHelper.FORMATS).toHaveProperty('SHORT_DATE', 'MMM d');
      expect(DateHelper.FORMATS).toHaveProperty('SHORT_DATE_SLASH', 'M/d');
      expect(DateHelper.FORMATS).toHaveProperty('TIME_12H', 'h:mm a');
      expect(DateHelper.FORMATS).toHaveProperty('ISO_DATE', 'yyyy-MM-dd');
    });
  });

  describe('formatPeriodRange', () => {
    test('should format date range with default separator', () => {
      const result = DateHelper.formatPeriodRange(testDate, testDate2);
      expect(result).toBe('Jan 15 - Jan 28');
    });

    test('should format date range with custom separator', () => {
      const result = DateHelper.formatPeriodRange(testDate, testDate2, ' to ');
      expect(result).toBe('Jan 15 to Jan 28');
    });
  });

  describe('formatPeriodRangeSlash', () => {
    test('should format date range with slash notation', () => {
      const result = DateHelper.formatPeriodRangeSlash(testDate, testDate2);
      expect(result).toBe('1/15 - 1/28');
    });
  });

  describe('formatTime', () => {
    test('should format time in 12-hour format', () => {
      const morningTime = new Date('2025-01-15T09:30:00');
      const afternoonTime = new Date('2025-01-15T14:30:00');
      const midnightTime = new Date('2025-01-15T00:00:00');
      const noonTime = new Date('2025-01-15T12:00:00');
      
      expect(DateHelper.formatTime(morningTime)).toMatch(/9:30 AM/);
      expect(DateHelper.formatTime(afternoonTime)).toMatch(/2:30 PM/);
      expect(DateHelper.formatTime(midnightTime)).toMatch(/12:00 AM/);
      expect(DateHelper.formatTime(noonTime)).toMatch(/12:00 PM/);
    });
  });

  describe('format', () => {
    test('should format date with custom format string', () => {
      expect(DateHelper.format(testDate, 'yyyy-MM-dd')).toBe('2025-01-15');
      expect(DateHelper.format(testDate, 'MMM d, yyyy')).toBe('Jan 15, 2025');
    });
  });

  describe('formatISO', () => {
    test('should format date in ISO format', () => {
      expect(DateHelper.formatISO(testDate)).toBe('2025-01-15');
    });
  });

  describe('formatFullWithWeekday', () => {
    test('should format date with full weekday', () => {
      const result = DateHelper.formatFullWithWeekday(testDate);
      expect(result).toMatch(/Wednesday, January 15/);
    });
  });

  describe('getStartOfDay and getEndOfDay', () => {
    test('should return start of day', () => {
      const start = DateHelper.getStartOfDay(testDate);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
    });

    test('should return end of day', () => {
      const end = DateHelper.getEndOfDay(testDate);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });
  });

  describe('date arithmetic', () => {
    test('addDays should add days correctly', () => {
      const result = DateHelper.addDays(testDate, 5);
      expect(result.getDate()).toBe(20);
    });

    test('subDays should subtract days correctly', () => {
      const result = DateHelper.subDays(testDate, 5);
      expect(result.getDate()).toBe(10);
    });

    test('addHours should add hours correctly', () => {
      const result = DateHelper.addHours(testDate, 3);
      expect(result.getHours()).toBe(testDate.getHours() + 3);
    });

    test('subHours should subtract hours correctly', () => {
      const result = DateHelper.subHours(testDate, 2);
      expect(result.getHours()).toBe(testDate.getHours() - 2);
    });

    test('addMinutes should add minutes correctly', () => {
      const result = DateHelper.addMinutes(testDate, 45);
      expect(result.getMinutes()).toBe(15); // 30 + 45 = 75 minutes = 1:15
      expect(result.getHours()).toBe(testDate.getHours() + 1);
    });
  });

  describe('calculatePeriodDates', () => {
    test('should calculate period dates correctly', () => {
      const baseDate = new Date('2025-01-01T12:00:00');
      const result = DateHelper.calculatePeriodDates(baseDate, 2, 14);
      
      expect(result.start.toDateString()).toBe(new Date('2025-01-16T12:00:00').toDateString());
      expect(result.end.toDateString()).toBe(new Date('2025-01-29T12:00:00').toDateString());
    });
  });

  describe('getDaysBetween', () => {
    test('should calculate days between dates', () => {
      const date1 = new Date('2025-01-15T12:00:00');
      const date2 = new Date('2025-01-20T12:00:00');
      
      expect(DateHelper.getDaysBetween(date1, date2)).toBe(5);
      expect(DateHelper.getDaysBetween(date2, date1)).toBe(5); // Should be absolute
    });
  });

  describe('isSameDay', () => {
    test('should correctly identify same day', () => {
      const date1 = new Date('2025-01-15T09:00:00');
      const date2 = new Date('2025-01-15T18:00:00');
      const date3 = new Date('2025-01-16T09:00:00');
      
      expect(DateHelper.isSameDay(date1, date2)).toBe(true);
      expect(DateHelper.isSameDay(date1, date3)).toBe(false);
    });
  });

  describe('setTime', () => {
    test('should set time correctly', () => {
      const result = DateHelper.setTime(testDate, 9, 30);
      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(30);
    });

    test('should default minutes to 0', () => {
      const result = DateHelper.setTime(testDate, 9);
      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(0);
    });
  });

  describe('calculateNotificationTime', () => {
    test('should calculate notification time correctly', () => {
      const targetTime = new Date('2025-01-15T14:00:00');
      const notifyTime = DateHelper.calculateNotificationTime(targetTime, 2);
      
      expect(notifyTime.getHours()).toBe(12);
      expect(notifyTime.toDateString()).toBe(targetTime.toDateString());
    });
  });

  describe('formatDuration', () => {
    test('should format whole hours', () => {
      expect(DateHelper.formatDuration(8)).toBe('8h');
    });

    test('should format hours and minutes', () => {
      expect(DateHelper.formatDuration(8.5)).toBe('8h 30m');
      expect(DateHelper.formatDuration(2.25)).toBe('2h 15m');
      expect(DateHelper.formatDuration(1.75)).toBe('1h 45m');
    });
  });

  describe('getDateAtNoon', () => {
    test('should return date at noon', () => {
      const result = DateHelper.getDateAtNoon(testDate);
      expect(result.getHours()).toBe(12);
      expect(result.getMinutes()).toBe(0);
    });
  });

  describe('isFuture and isPast', () => {
    test('should correctly identify future dates', () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      
      expect(DateHelper.isFuture(futureDate)).toBe(true);
      expect(DateHelper.isFuture(pastDate)).toBe(false);
    });

    test('should correctly identify past dates', () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      
      expect(DateHelper.isPast(pastDate)).toBe(true);
      expect(DateHelper.isPast(futureDate)).toBe(false);
    });
  });

  describe('formatRelativeTime', () => {
    test('should format time in minutes', () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      expect(DateHelper.formatRelativeTime(futureDate)).toBe('in 30 minutes');
    });

    test('should format time in hours', () => {
      const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours
      expect(DateHelper.formatRelativeTime(futureDate)).toBe('in 3 hours');
    });

    test('should format time in days', () => {
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
      expect(DateHelper.formatRelativeTime(futureDate)).toBe('in 2 days');
    });

    test('should handle past dates', () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      expect(DateHelper.formatRelativeTime(pastDate)).toBe('in the past');
    });
  });

  describe('createUTCDate', () => {
    test('should create UTC date at midnight', () => {
      const result = DateHelper.createUTCDate('2025-01-15');
      expect(result.toISOString()).toBe('2025-01-15T00:00:00.000Z');
    });
  });
});