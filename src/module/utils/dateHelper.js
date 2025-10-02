/**
 * Date utility functions
 */

/**
 * Format date to Indonesian locale
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string
 */
export function formatDateID(date) {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

/**
 * Get current timestamp
 * @returns {string} ISO timestamp
 */
export function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Check if date is valid
 * @param {any} date - Date to validate
 * @returns {boolean} True if valid date
 */
export function isValidDate(date) {
  return date instanceof Date && !isNaN(date);
}
