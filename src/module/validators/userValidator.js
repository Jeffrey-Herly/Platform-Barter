/**
 * User validation functions
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with isValid and message
 */
export function validatePassword(password) {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: 'Password harus minimal 8 karakter'
    };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return {
      isValid: false,
      message: 'Password harus mengandung huruf kecil'
    };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return {
      isValid: false,
      message: 'Password harus mengandung huruf besar'
    };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return {
      isValid: false,
      message: 'Password harus mengandung angka'
    };
  }
  
  return {
    isValid: true,
    message: 'Password valid'
  };
}

/**
 * Validate Indonesian phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone number
 */
export function isValidPhoneID(phone) {
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
  return phoneRegex.test(phone);
}
