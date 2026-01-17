/**
 * Date utility functions for KRISIS application
 * Ensures dates are always in YYYY-MM-DD format for Firestore compatibility
 */

/**
 * Converts a date to YYYY-MM-DD format
 * @param date - Date object or date string
 * @returns Formatted date string in YYYY-MM-DD format
 */
export function formatDateForFirestore(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Validate that the date is valid
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided');
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Validates if a string is in YYYY-MM-DD format
 * @param dateString - Date string to validate
 * @returns True if valid YYYY-MM-DD format, false otherwise
 */
export function isValidDateFormat(dateString: string): boolean {
  if (typeof dateString !== 'string' || dateString.length !== 10) {
    return false;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  // Additional validation: check if it's actually a valid date
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return false;
  }

  // Check if the formatted version matches (prevents 2023-02-30, etc.)
  return formatDateForFirestore(date) === dateString;
}

/**
 * Gets today's date in YYYY-MM-DD format
 * @returns Today's date string
 */
export function getTodayDate(): string {
  return formatDateForFirestore(new Date());
}

/**
 * Converts YYYY-MM-DD string to a readable format for display
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Human-readable date string
 */
export function formatDateForDisplay(dateString: string): string {
  if (!isValidDateFormat(dateString)) {
    return 'Invalid Date';
  }

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Validates and normalizes a date input for Firestore
 * @param dateInput - Date input (Date object, string, or undefined)
 * @param fallbackToToday - If true, returns today's date for invalid inputs
 * @returns Valid YYYY-MM-DD formatted date string
 * @throws Error if dateInput is invalid and fallbackToToday is false
 */
export function validateAndNormalizeDate(
  dateInput: Date | string | undefined,
  fallbackToToday: boolean = false
): string {
  try {
    if (!dateInput) {
      if (fallbackToToday) {
        return getTodayDate();
      }
      throw new Error('Date is required');
    }

    if (typeof dateInput === 'string') {
      if (isValidDateFormat(dateInput)) {
        return dateInput;
      }
      // Try to parse and reformat
      return formatDateForFirestore(dateInput);
    }

    return formatDateForFirestore(dateInput);
  } catch (error) {
    if (fallbackToToday) {
      return getTodayDate();
    }
    throw error;
  }
}