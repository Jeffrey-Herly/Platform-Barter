// src/utils/jwt.util.js
'use strict';

const jwt = require('jsonwebtoken');

/**
 * JWT Utility
 * Handles JWT token generation and verification
 */

// Load from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // 7 days default
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

class JwtUtil {
    /**
     * Generate access token
     * @param {Object} payload - { userId, email, fullName }
     * @returns {string} JWT token
     */
    static generateAccessToken(payload) {
        try {
            return jwt.sign(
                {
                    userId: payload.userId,
                    email: payload.email,
                    fullName: payload.fullName,
                    type: 'access'
                },
                JWT_SECRET,
                {
                    expiresIn: JWT_EXPIRES_IN,
                    issuer: 'barter-platform',
                    audience: 'barter-users'
                }
            );
        } catch (error) {
            throw new Error(`Error generating access token: ${error.message}`);
        }
    }

    /**
     * Generate refresh token
     * @param {Object} payload - { userId, email }
     * @returns {string} JWT refresh token
     */
    static generateRefreshToken(payload) {
        try {
            return jwt.sign(
                {
                    userId: payload.userId,
                    email: payload.email,
                    type: 'refresh'
                },
                JWT_SECRET,
                {
                    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
                    issuer: 'barter-platform',
                    audience: 'barter-users'
                }
            );
        } catch (error) {
            throw new Error(`Error generating refresh token: ${error.message}`);
        }
    }

    /**
     * Verify JWT token
     * @param {string} token 
     * @returns {Object} Decoded payload
     */
    static verify(token) {
        try {
            return jwt.verify(token, JWT_SECRET, {
                issuer: 'barter-platform',
                audience: 'barter-users'
            });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token has expired');
            }
            if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            }
            throw new Error(`Error verifying token: ${error.message}`);
        }
    }

    /**
     * Decode token without verification (for debugging)
     * @param {string} token 
     * @returns {Object|null}
     */
    static decode(token) {
        try {
            return jwt.decode(token);
        } catch (error) {
            return null;
        }
    }

    /**
     * Get token expiration time
     * @param {string} token 
     * @returns {Date|null}
     */
    static getExpiration(token) {
        try {
            const decoded = this.decode(token);
            return decoded && decoded.exp
                ? new Date(decoded.exp * 1000)
                : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Check if token is expired
     * @param {string} token 
     * @returns {boolean}
     */
    static isExpired(token) {
        try {
            const expiration = this.getExpiration(token);
            return expiration ? expiration < new Date() : true;
        } catch (error) {
            return true;
        }
    }
}

module.exports = JwtUtil;