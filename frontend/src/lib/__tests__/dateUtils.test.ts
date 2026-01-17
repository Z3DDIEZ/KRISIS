import {
  formatDateForFirestore,
  isValidDateFormat,
  getTodayDate,
  formatDateForDisplay,
  validateAndNormalizeDate
} from '../dateUtils';

describe('Date Utils', () => {
  describe('formatDateForFirestore', () => {
    it('formats a Date object to YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatDateForFirestore(date)).toBe('2024-01-15');
    });

    it('formats a valid date string to YYYY-MM-DD', () => {
      expect(formatDateForFirestore('2024-01-15')).toBe('2024-01-15');
    });

    it('throws error for invalid date', () => {
      expect(() => formatDateForFirestore('invalid')).toThrow('Invalid date provided');
    });
  });

  describe('isValidDateFormat', () => {
    it('returns true for valid YYYY-MM-DD format', () => {
      expect(isValidDateFormat('2024-01-15')).toBe(true);
      expect(isValidDateFormat('2023-12-31')).toBe(true);
    });

    it('returns false for invalid formats', () => {
      expect(isValidDateFormat('')).toBe(false);
      expect(isValidDateFormat('2024/01/15')).toBe(false);
      expect(isValidDateFormat('2024-1-15')).toBe(false);
      expect(isValidDateFormat('24-01-15')).toBe(false);
      expect(isValidDateFormat('2024-13-15')).toBe(false); // Invalid month
      expect(isValidDateFormat('2024-01-32')).toBe(false); // Invalid day
    });

    it('returns false for invalid dates like Feb 30th', () => {
      expect(isValidDateFormat('2024-02-30')).toBe(false);
    });
  });

  describe('getTodayDate', () => {
    it('returns today\'s date in YYYY-MM-DD format', () => {
      const today = new Date();
      const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(getTodayDate()).toBe(expected);
    });
  });

  describe('formatDateForDisplay', () => {
    it('formats YYYY-MM-DD to readable format', () => {
      expect(formatDateForDisplay('2024-01-15')).toBe('Jan 15, 2024');
      expect(formatDateForDisplay('2023-12-31')).toBe('Dec 31, 2023');
    });

    it('returns "Invalid Date" for invalid format', () => {
      expect(formatDateForDisplay('invalid')).toBe('Invalid Date');
      expect(formatDateForDisplay('2024-13-15')).toBe('Invalid Date');
    });
  });

  describe('validateAndNormalizeDate', () => {
    it('returns valid YYYY-MM-DD string as-is', () => {
      expect(validateAndNormalizeDate('2024-01-15')).toBe('2024-01-15');
    });

    it('normalizes Date object to YYYY-MM-DD', () => {
      const date = new Date(2024, 0, 15);
      expect(validateAndNormalizeDate(date)).toBe('2024-01-15');
    });

    it('normalizes valid date string to YYYY-MM-DD', () => {
      expect(validateAndNormalizeDate('January 15, 2024')).toBe('2024-01-15');
    });

    it('throws error for invalid date when fallback disabled', () => {
      expect(() => validateAndNormalizeDate('invalid')).toThrow();
      expect(() => validateAndNormalizeDate(undefined)).toThrow();
    });

    it('returns today\'s date for invalid input when fallback enabled', () => {
      const result = validateAndNormalizeDate('invalid', true);
      expect(isValidDateFormat(result)).toBe(true);

      const result2 = validateAndNormalizeDate(undefined, true);
      expect(isValidDateFormat(result2)).toBe(true);
    });
  });
});