/**
 * SSL/TLS Configuration for HTTPS
 * Handles certificate loading and SSL options
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load SSL certificates for HTTPS
 * @param {string} environment - Current environment (development, production)
 * @returns {object|null} SSL options object or null if certificates not found
 */
export function loadSSLCertificates(environment = 'development') {
  try {
    let certPath, keyPath;
    
    if (environment === 'production') {
      // Production certificates (dari Let's Encrypt atau CA lainnya)
      certPath = process.env.SSL_CERT_PATH || '/etc/ssl/certs/server.crt';
      keyPath = process.env.SSL_KEY_PATH || '/etc/ssl/private/server.key';
    } else {
      // Development self-signed certificates
      certPath = join(__dirname, '../ssl/dev/server.crt');
      keyPath = join(__dirname, '../ssl/dev/server.key');
    }

    const cert = readFileSync(certPath);
    const key = readFileSync(keyPath);

    console.log(`✅ SSL certificates loaded successfully for ${environment} environment`);
    
    return {
      key: key,
      cert: cert,
      // Additional SSL options
      secureProtocol: 'TLSv1_2_method', // Use TLS 1.2+
      ciphers: [
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-SHA256',
        'ECDHE-RSA-AES256-SHA384'
      ].join(':'),
      honorCipherOrder: true
    };
    
  } catch (error) {
    console.warn(`⚠️  SSL certificates not found for ${environment} environment:`, error.message);
    console.warn('   Server will run in HTTP mode');
    return null;
  }
}

/**
 * Get HTTPS configuration for Fastify
 * @param {string} environment - Current environment
 * @returns {object} Fastify HTTPS options
 */
export function getHTTPSConfig(environment = 'development') {
  const sslOptions = loadSSLCertificates(environment);
  
  if (!sslOptions) {
    return { https: null };
  }

  return {
    https: sslOptions,
    http2: process.env.ENABLE_HTTP2 === 'true' // Optional HTTP/2 support
  };
}

/**
 * Check if HTTPS is enabled
 * @returns {boolean} True if HTTPS should be enabled
 */
export function isHTTPSEnabled() {
  return process.env.ENABLE_HTTPS === 'true' || process.env.NODE_ENV === 'production';
}

/**
 * Get server port configuration
 * @param {boolean} isHttps - Whether HTTPS is enabled
 * @returns {object} Port configuration
 */
export function getPortConfig(isHttps = false) {
  const defaultHttpPort = 2000;
  const defaultHttpsPort = 2443;
  
  return {
    port: isHttps 
      ? parseInt(process.env.HTTPS_PORT || defaultHttpsPort)
      : parseInt(process.env.HTTP_PORT || defaultHttpPort),
    host: process.env.HOST || 'localhost'
  };
}
