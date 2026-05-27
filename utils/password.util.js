// src/utils/password.util.js
'use strict';

const bcrypt = require('bcrypt');

/**
 * Password Utility
 * Handles password hashing and verification using bcrypt
 */

const SALT_ROUNDS = 10;

class PasswordUtil {
    /**
     * Hash password using bcrypt
     * @param {string} plainPassword 
     * @returns {Promise<string>} Hashed password
     */
    static async hash(plainPassword) {
        try {
            return await bcrypt.hash(plainPassword, SALT_ROUNDS);
        } catch (error) {
            throw new Error(`Error hashing password: ${error.message}`);
        }
    }

    /**
     * Verify password against hash
     * @param {string} plainPassword 
     * @param {string} hashedPassword 
     * @returns {Promise<boolean>}
     */
    static async verify(plainPassword, hashedPassword) {
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (error) {
            throw new Error(`Error verifying password: ${error.message}`);
        }
    }

    /**
     * Validate password strength
     * @param {string} password 
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    static validateStrength(password) {
        const errors = [];

        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        // Optional: special character requirement
        // if (!/[!@#$%^&*]/.test(password)) {
        //   errors.push('Password must contain at least one special character');
        // }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = PasswordUtil;