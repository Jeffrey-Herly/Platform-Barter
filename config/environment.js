/**
 * Environment Configuration
 * Centralized configuration management for different environments
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file
config();

/**
 * Get current environment
 * @returns {string} Current environment (development, production, test)
 */
export function getEnvironment() {
  return process.env.NODE_ENV || 'development';
}

/**
 * Check if running in development mode
 * @returns {boolean} True if development environment
 */
export function isDevelopment() {
  return getEnvironment() === 'development';
}

/**
 * Check if running in production mode
 * @returns {boolean} True if production environment
 */
export function isProduction() {
  return getEnvironment() === 'production';
}

/**
 * Get server configuration
 * @returns {object} Server configuration object
 */
export function getServerConfig() {
  const env = getEnvironment();
  
  return {
    // Environment
    environment: env,
    
    // HTTPS Configuration
    https: {
      enabled: process.env.ENABLE_HTTPS === 'true' || isProduction(),
      port: parseInt(process.env.HTTPS_PORT || '2443'),
      http2: process.env.ENABLE_HTTP2 === 'true'
    },
    
    // HTTP Configuration (fallback)
    http: {
      port: parseInt(process.env.HTTP_PORT || '2000'),
      host: process.env.HOST || 'localhost'
    },
    
    // SSL Certificates
    ssl: {
      certPath: process.env.SSL_CERT_PATH,
      keyPath: process.env.SSL_KEY_PATH,
      caPath: process.env.SSL_CA_PATH // Optional CA certificate
    },
    
    // Security
    security: {
      forceHttps: process.env.FORCE_HTTPS === 'true',
      hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000'), // 1 year
      hstsIncludeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS === 'true'
    },
    
    // Logging
    logging: {
      level: process.env.LOG_LEVEL || (isDevelopment() ? 'debug' : 'info'),
      prettyPrint: isDevelopment()
    }
  };
}

/**
 * Validate required environment variables
 * @returns {object} Validation result
 */
export function validateEnvironment() {
  const config = getServerConfig();
  const errors = [];
  const warnings = [];
  
  // Check HTTPS configuration in production
  if (isProduction() && config.https.enabled) {
    if (!config.ssl.certPath) {
      errors.push('SSL_CERT_PATH is required in production with HTTPS enabled');
    }
    if (!config.ssl.keyPath) {
      errors.push('SSL_KEY_PATH is required in production with HTTPS enabled');
    }
  }
  
  // Check development HTTPS setup
  if (isDevelopment() && config.https.enabled) {
    warnings.push('HTTPS enabled in development - ensure self-signed certificates are generated');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config
  };
}
