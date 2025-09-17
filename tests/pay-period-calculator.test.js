const PayPeriodCalculator = require('../shared/pay-period-calculator');

describe('PayPeriodCalculator', () => {
  let calculator;
  
  beforeEach(() => {
    // Use fixed dates for testing
    calculator = new PayPeriodCalculator({
      basePeriodNumber: 18,
      basePeriodEndDate: new Date('2025-06-23T12:00:00'),
      periodLengthDays: 14,
      paymentDelayDays: 7
    });
  });

  describe('getCurrentPeriodInfo', () => {
    test('should return correct period info for base period end date', () => {
      const testDate = new Date('2025-06-23T12:00:00');
      const periodInfo = calculator.getCurrentPeriodInfo(testDate);
      
      expect(periodInfo.currentPeriod.number).toBe(18);
      expect(periodInfo.currentPeriod.startDate.toDateString()).toBe(new Date('2025-06-10T12:00:00').toDateString());
      expect(periodInfo.currentPeriod.endDate.toDateString()).toBe(new Date('2025-06-23T12:00:00').toDateString());
      expect(periodInfo.currentPeriod.paymentDate.toDateString()).toBe(new Date('2025-06-30T12:00:00').toDateString());
      expect(periodInfo.nextPeriod.number).toBe(19);
    });

    test('should return correct period info for date in next period', () => {
      const testDate = new Date('2025-06-24T12:00:00');
      const periodInfo = calculator.getCurrentPeriodInfo(testDate);
      
      expect(periodInfo.currentPeriod.number).toBe(19);
      expect(periodInfo.currentPeriod.startDate.toDateString()).toBe(new Date('2025-06-24T12:00:00').toDateString());
      expect(periodInfo.currentPeriod.endDate.toDateString()).toBe(new Date('2025-07-07T12:00:00').toDateString());
    });

    test('should handle dates far in the future', () => {
      const testDate = new Date('2025-12-31T12:00:00');
      const periodInfo = calculator.getCurrentPeriodInfo(testDate);
      
      expect(periodInfo.currentPeriod.number).toBeGreaterThan(18);
      expect(periodInfo.nextPeriod.number).toBe(periodInfo.currentPeriod.number + 1);
    });

    test('should handle dates before base period', () => {
      const testDate = new Date('2025-06-01T12:00:00');
      const periodInfo = calculator.getCurrentPeriodInfo(testDate);
      
      expect(periodInfo.currentPeriod.number).toBe(18);
    });
  });

  describe('isLastDayOfPeriod', () => {
    test('should return true on the last day of a period', () => {
      const lastDay = new Date('2025-06-23T12:00:00');
      expect(calculator.isLastDayOfPeriod(lastDay)).toBe(true);
    });

    test('should return false on other days', () => {
      const notLastDay = new Date('2025-06-22T12:00:00');
      expect(calculator.isLastDayOfPeriod(notLastDay)).toBe(false);
    });
  });

  describe('getDaysUntilPeriodEnd', () => {
    test('should return 0 on the last day', () => {
      const lastDay = new Date('2025-06-23T12:00:00');
      expect(calculator.getDaysUntilPeriodEnd(lastDay)).toBe(0);
    });

    test('should return correct days count', () => {
      const testDate = new Date('2025-06-20T12:00:00');
      expect(calculator.getDaysUntilPeriodEnd(testDate)).toBe(3);
    });

    test('should not return negative days', () => {
      const pastDate = new Date('2025-06-24T12:00:00');
      expect(calculator.getDaysUntilPeriodEnd(pastDate)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('formatting methods', () => {
    test('formatDate should use default format', () => {
      const date = new Date('2025-06-23T12:00:00');
      expect(calculator.formatDate(date)).toBe('6/23');
    });

    test('formatDate should accept custom format', () => {
      const date = new Date('2025-06-23T12:00:00');
      expect(calculator.formatDate(date, 'yyyy-MM-dd')).toBe('2025-06-23');
    });

    test('formatDateFull should return full date format', () => {
      const date = new Date('2025-06-23T12:00:00');
      expect(calculator.formatDateFull(date)).toMatch(/June 23(rd|th), 2025/);
    });
  });

  describe('getOrdinal', () => {
    test('should return correct ordinals', () => {
      expect(calculator.getOrdinal(1)).toBe('1st');
      expect(calculator.getOrdinal(2)).toBe('2nd');
      expect(calculator.getOrdinal(3)).toBe('3rd');
      expect(calculator.getOrdinal(4)).toBe('4th');
      expect(calculator.getOrdinal(11)).toBe('11th');
      expect(calculator.getOrdinal(21)).toBe('21st');
      expect(calculator.getOrdinal(22)).toBe('22nd');
      expect(calculator.getOrdinal(23)).toBe('23rd');
    });
  });

  describe('generateReminderMessage', () => {
    test('should generate correct reminder message', () => {
      const testDate = new Date('2025-06-23T12:00:00');
      const message = calculator.generateReminderMessage({
        referenceDate: testDate,
        includeExtraHours: true,
        teamName: 'Dev Team'
      });

      expect(message).toContain('Good Morning Dev Team');
      expect(message).toContain('18th pay-period');
      expect(message).toContain('6/10 – 6/23');
      expect(message).toContain('extra hours');
      expect(message).toContain('@here');
    });

    test('should exclude extra hours section when specified', () => {
      const testDate = new Date('2025-06-23T12:00:00');
      const message = calculator.generateReminderMessage({
        referenceDate: testDate,
        includeExtraHours: false,
        teamName: 'Dev Team'
      });

      expect(message).not.toContain('extra hours');
    });
  });

  describe('getCurrentPayPeriod', () => {
    test('should return simplified pay period format', () => {
      const testDate = new Date('2025-06-23T12:00:00');
      const period = calculator.getCurrentPayPeriod(testDate);

      expect(period).toHaveProperty('id', '2025-18');
      expect(period).toHaveProperty('number', 18);
      expect(period).toHaveProperty('start');
      expect(period).toHaveProperty('end');
      expect(period).toHaveProperty('paymentDate');
      expect(period.start.toDateString()).toBe(new Date('2025-06-10T12:00:00').toDateString());
    });
  });

  describe('generateBotFormattedMessage', () => {
    test('should return bot-formatted message data', () => {
      const testDate = new Date('2025-06-23T12:00:00');
      const botData = calculator.generateBotFormattedMessage('test-bot', {
        referenceDate: testDate
      });

      expect(botData).toHaveProperty('periodNumber', 18);
      expect(botData).toHaveProperty('periodOrdinal', '18th');
      expect(botData).toHaveProperty('startDate', '6/10');
      expect(botData).toHaveProperty('endDate', '6/23');
      expect(botData).toHaveProperty('nextPeriodNumber', 19);
      expect(botData).toHaveProperty('nextPeriodOrdinal', '19th');
      expect(botData).toHaveProperty('daysRemaining', 0);
    });
  });
});