#!/usr/bin/env node

/**
 * Node.js script untuk generate self-signed SSL certificates
 * Alternative untuk bash script, menggunakan Node.js dan OpenSSL
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

// Configuration
const config = {
  certDir: join(projectRoot, 'ssl', 'dev'),
  certFile: 'server.crt',
  keyFile: 'server.key',
  csrFile: 'server.csr',
  configFile: 'ssl.conf',
  days: 365,
  keySize: 2048,
  subject: {
    country: 'ID',
    state: 'Jakarta',
    city: 'Jakarta',
    organization: 'TTU Development',
    organizationUnit: 'IT Department',
    commonName: 'localhost'
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkOpenSSL() {
  try {
    execSync('openssl version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

function createSSLConfig() {
  const configContent = `[req]
default_bits = ${config.keySize}
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=${config.subject.country}
ST=${config.subject.state}
L=${config.subject.city}
O=${config.subject.organization}
OU=${config.subject.organizationUnit}
CN=${config.subject.commonName}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
`;

  const configPath = join(config.certDir, config.configFile);
  writeFileSync(configPath, configContent);
  log(`📝 Created OpenSSL configuration: ${configPath}`, 'yellow');
  return configPath;
}

function generateCertificates() {
  const keyPath = join(config.certDir, config.keyFile);
  const csrPath = join(config.certDir, config.csrFile);
  const certPath = join(config.certDir, config.certFile);
  const configPath = join(config.certDir, config.configFile);

  try {
    // Generate private key
    log('🔑 Generating private key...', 'yellow');
    execSync(`openssl genrsa -out "${keyPath}" ${config.keySize}`, { stdio: 'pipe' });

    // Generate certificate signing request
    log('📋 Generating certificate signing request...', 'yellow');
    execSync(`openssl req -new -key "${keyPath}" -out "${csrPath}" -config "${configPath}"`, { stdio: 'pipe' });

    // Generate self-signed certificate
    log('📜 Generating self-signed certificate...', 'yellow');
    execSync(`openssl x509 -req -in "${csrPath}" -signkey "${keyPath}" -out "${certPath}" -days ${config.days} -extensions v3_req -extfile "${configPath}"`, { stdio: 'pipe' });

    // Set permissions
    chmodSync(keyPath, 0o600);
    chmodSync(certPath, 0o644);

    // Clean up CSR file
    execSync(`rm "${csrPath}"`, { stdio: 'pipe' });

    return { keyPath, certPath };
  } catch (error) {
    throw new Error(`Failed to generate certificates: ${error.message}`);
  }
}

function verifyCertificate(certPath) {
  try {
    log('🔍 Certificate Information:', 'blue');
    
    // Get subject
    const subject = execSync(`openssl x509 -in "${certPath}" -subject -noout`, { encoding: 'utf8' });
    console.log(`   Subject: ${subject.trim().replace('subject=', '')}`);
    
    // Get validity
    const notAfter = execSync(`openssl x509 -in "${certPath}" -enddate -noout`, { encoding: 'utf8' });
    console.log(`   Valid until: ${notAfter.trim().replace('notAfter=', '')}`);
    
    // Get SAN
    try {
      const san = execSync(`openssl x509 -in "${certPath}" -text -noout | grep -A 1 "Subject Alternative Name"`, { encoding: 'utf8' });
      console.log(`   ${san.trim()}`);
    } catch (e) {
      // SAN might not be available in older OpenSSL versions
    }
    
  } catch (error) {
    log(`⚠️  Could not verify certificate: ${error.message}`, 'yellow');
  }
}

function createEnvExample() {
  const envContent = `# HTTPS Configuration
ENABLE_HTTPS=false
HTTPS_PORT=2443
HTTP_PORT=2000
HOST=localhost

# SSL Certificates (for production)
# SSL_CERT_PATH=/path/to/your/certificate.crt
# SSL_KEY_PATH=/path/to/your/private.key

# Security
FORCE_HTTPS=false
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=false

# HTTP/2 Support
ENABLE_HTTP2=false

# Environment
NODE_ENV=development
LOG_LEVEL=debug
`;

  const envPath = join(projectRoot, '.env.example');
  if (!existsSync(envPath)) {
    writeFileSync(envPath, envContent);
    log(`📄 Created .env.example file`, 'green');
  }
}

async function main() {
  try {
    log('🔐 SSL Certificate Generator for TTU Development', 'cyan');
    log('================================================', 'cyan');

    // Check if OpenSSL is available
    if (!checkOpenSSL()) {
      log('❌ OpenSSL is not installed or not in PATH', 'red');
      log('   Please install OpenSSL first:', 'yellow');
      log('   • Ubuntu/Debian: sudo apt-get install openssl', 'yellow');
      log('   • macOS: brew install openssl', 'yellow');
      log('   • Windows: Download from https://slproweb.com/products/Win32OpenSSL.html', 'yellow');
      process.exit(1);
    }

    // Create certificate directory
    if (!existsSync(config.certDir)) {
      mkdirSync(config.certDir, { recursive: true });
      log(`📁 Created certificate directory: ${config.certDir}`, 'green');
    }

    // Create SSL configuration
    createSSLConfig();

    // Generate certificates
    const { keyPath, certPath } = generateCertificates();

    log('✅ SSL certificates generated successfully!', 'green');
    log('📁 Certificate files:', 'blue');
    log(`   🔑 Private Key: ${keyPath}`, 'blue');
    log(`   📜 Certificate: ${certPath}`, 'blue');

    // Verify certificate
    verifyCertificate(certPath);

    // Create .env.example
    createEnvExample();

    log('⚠️  Important Notes:', 'yellow');
    log('   • These are self-signed certificates for development only', 'yellow');
    log('   • Your browser will show security warnings - this is normal', 'yellow');
    log('   • For production, use certificates from a trusted CA', 'yellow');
    log(`   • Certificate is valid for ${config.days} days`, 'yellow');

    log('🚀 To use HTTPS in development:', 'blue');
    log('   1. Copy .env.example to .env', 'blue');
    log('   2. Set ENABLE_HTTPS=true in your .env file', 'blue');
    log('   3. Start your server with: npm run dev', 'blue');
    log('   4. Visit: https://localhost:2443', 'blue');

    log('🎉 Setup complete!', 'green');

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as generateSSLCertificates };
