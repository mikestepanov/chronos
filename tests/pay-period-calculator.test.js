const PayPeriodCalculator = require('../shared/pay-period-calculator');

describe('PayPeriodCalculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new PayPeriodCalculator();
  });

  describe('getCurrentPeriodInfo', () => {
    it('should calculate current period correctly', () => {
      const testDate = new Date('2025-06-23T12:00:00');
      const result = calculator.getCurrentPeriodInfo(testDate);
      
      expect(result.currentPeriod.number).toBe(18);
      expect(result.currentPeriod.startDate).toEqual(new Date('2025-06-10T00:00:00'));
      expect(result.currentPeriod.endDate).toEqual(new Date('2025-06-23T23:59:59.999'));
    });

    it('should calculate next period correctly', () => {
      const testDate = new Date('2025-06-24T12:00:00');
      const result = calculator.getCurrentPeriodInfo(testDate);
      
      expect(result.currentPeriod.number).toBe(19);
      expect(result.currentPeriod.startDate).toEqual(new Date('2025-06-24T00:00:00'));
    });
  });

  describe('isLastDayOfPeriod', () => {
    it('should return true on last day of period', () => {
      const lastDay = new Date('2025-06-23T12:00:00');
      expect(calculator.isLastDayOfPeriod(lastDay)).toBe(true);
    });

    it('should return false on other days', () => {
      const notLastDay = new Date('2025-06-22T12:00:00');
      expect(calculator.isLastDayOfPeriod(notLastDay)).toBe(false);
    });
  });

  describe('generateReminderMessage', () => {
    it('should generate correct reminder message', () => {
      const testDate = new Date('2025-06-23T12:00:00');
      const message = calculator.generateReminderMessage({
        referenceDate: testDate,
        teamName: 'Test Team'
      });
      
      expect(message).toContain('Good Morning Test Team');
      expect(message).toContain('18th pay-period');
      expect(message).toContain('6/10 – 6/23');
    });
  });
});