# 🔒 HTTPS Setup Guide untuk TTU Application

Panduan lengkap untuk mengaktifkan HTTPS pada aplikasi TTU menggunakan Fastify.

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Development Setup](#development-setup)
4. [Production Setup](#production-setup)
5. [Configuration](#configuration)
6. [Security Features](#security-features)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

## 🎯 Overview

Aplikasi TTU mendukung HTTPS dengan fitur-fitur berikut:

- ✅ **Self-signed certificates** untuk development
- ✅ **Production-ready SSL/TLS** configuration
- ✅ **HTTP to HTTPS redirect**
- ✅ **Security headers** (HSTS, CSP, dll.)
- ✅ **HTTP/2 support** (opsional)
- ✅ **Automatic certificate loading**
- ✅ **Environment-based configuration**

## 🚀 Quick Start

### 1. Generate SSL Certificates (Development)

```bash
# Menggunakan Node.js script (recommended)
npm run generate-ssl

# Atau menggunakan bash script
npm run generate-ssl:bash

# Atau manual
node scripts/generate-ssl-cert.js
```

### 2. Setup Environment

```bash
# Copy environment template
cp env.example .env

# Edit .env file
nano .env
```

Set `ENABLE_HTTPS=true` di file `.env`:

```env
ENABLE_HTTPS=true
HTTPS_PORT=2443
HTTP_PORT=2000
```

### 3. Install Dependencies & Start Server

```bash
# Install dotenv jika belum ada
npm install dotenv

# Start dengan HTTPS
npm run dev:https

# Atau set environment variable manual
ENABLE_HTTPS=true npm run dev
```

### 4. Test HTTPS

```bash
# Test HTTP endpoint
npm run test:http

# Test HTTPS endpoint
npm run test:https

# Atau manual
curl -k https://localhost:2443/health
```

## 🛠️ Development Setup

### Automatic Certificate Generation

Script akan otomatis generate self-signed certificates:

```bash
npm run setup:https
```

Ini akan:
- Generate private key (`ssl/dev/server.key`)
- Generate certificate (`ssl/dev/server.crt`)
- Create OpenSSL config (`ssl/dev/ssl.conf`)
- Set proper file permissions

### Manual Certificate Generation

Jika ingin generate manual:

```bash
# Buat direktori SSL
mkdir -p ssl/dev

# Generate private key
openssl genrsa -out ssl/dev/server.key 2048

# Generate certificate
openssl req -new -x509 -key ssl/dev/server.key -out ssl/dev/server.crt -days 365 \
  -subj "/C=ID/ST=Jakarta/L=Jakarta/O=TTU Development/OU=IT/CN=localhost"
```

### Development Environment Variables

```env
# Development HTTPS
NODE_ENV=development
ENABLE_HTTPS=true
HTTPS_PORT=2443
HTTP_PORT=2000
HOST=localhost

# Security (relaxed for development)
FORCE_HTTPS=false
HSTS_MAX_AGE=0

# Logging
LOG_LEVEL=debug
```

## 🏭 Production Setup

### 1. Obtain SSL Certificates

**Option A: Let's Encrypt (Free)**

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Certificates akan tersimpan di:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

**Option B: Commercial CA**

Beli certificate dari CA seperti DigiCert, Comodo, dll.

### 2. Production Environment Variables

```env
# Production HTTPS
NODE_ENV=production
ENABLE_HTTPS=true
HTTPS_PORT=443
HTTP_PORT=80
HOST=0.0.0.0

# SSL Certificates
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# Security (strict for production)
FORCE_HTTPS=true
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=true

# HTTP/2
ENABLE_HTTP2=true

# Logging
LOG_LEVEL=info
```

### 3. Server Configuration

**Nginx Reverse Proxy (Recommended)**

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Direct HTTPS (Alternative)**

```env
# Run aplikasi langsung di port 443 (requires sudo)
HTTPS_PORT=443
HTTP_PORT=80
```

### 4. Systemd Service

```ini
# /etc/systemd/system/ttu-app.service
[Unit]
Description=TTU Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ttu
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/app.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_HTTPS` | `false` | Enable HTTPS server |
| `HTTPS_PORT` | `2443` | HTTPS port |
| `HTTP_PORT` | `2000` | HTTP port |
| `HOST` | `localhost` | Server host |
| `SSL_CERT_PATH` | - | Path to SSL certificate |
| `SSL_KEY_PATH` | - | Path to SSL private key |
| `SSL_CA_PATH` | - | Path to CA certificate (optional) |
| `FORCE_HTTPS` | `false` | Redirect HTTP to HTTPS |
| `HSTS_MAX_AGE` | `31536000` | HSTS max age in seconds |
| `HSTS_INCLUDE_SUBDOMAINS` | `false` | Include subdomains in HSTS |
| `ENABLE_HTTP2` | `false` | Enable HTTP/2 support |

### SSL Configuration

File: `config/ssl.js`

```javascript
// Custom SSL options
export function getHTTPSConfig(environment = 'development') {
  const sslOptions = loadSSLCertificates(environment);
  
  if (!sslOptions) {
    return { https: null };
  }

  return {
    https: {
      ...sslOptions,
      // Custom SSL options
      secureProtocol: 'TLSv1_2_method',
      ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:...',
      honorCipherOrder: true
    },
    http2: process.env.ENABLE_HTTP2 === 'true'
  };
}
```

## 🛡️ Security Features

### 1. Security Headers

Otomatis ditambahkan saat HTTPS aktif:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### 2. HTTPS Redirect

```javascript
// Automatic HTTP to HTTPS redirect
if (serverConfig.security.forceHttps && request.protocol !== 'https') {
  const httpsUrl = `https://${request.hostname}:${serverConfig.https.port}${request.url}`;
  return reply.redirect(301, httpsUrl);
}
```

### 3. Certificate Validation

```javascript
// Validate certificates on startup
const sslOptions = loadSSLCertificates(environment);
if (!sslOptions) {
  console.warn('SSL certificates not found, falling back to HTTP');
}
```

## 🔧 Troubleshooting

### Common Issues

**1. Certificate not found**

```
⚠️ SSL certificates not found for development environment
```

**Solution:**
```bash
npm run generate-ssl
```

**2. Permission denied on port 443**

```
Error: listen EACCES: permission denied :::443
```

**Solution:**
```bash
# Use sudo or change port
sudo npm start

# Or use port > 1024
HTTPS_PORT=2443 npm start
```

**3. Browser security warning**

```
NET::ERR_CERT_AUTHORITY_INVALID
```

**Solution:**
- Development: Click "Advanced" → "Proceed to localhost (unsafe)"
- Production: Use certificates from trusted CA

**4. HTTPS redirect loop**

**Solution:**
```env
# Disable force HTTPS in development
FORCE_HTTPS=false
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev:https

# Check certificate info
openssl x509 -in ssl/dev/server.crt -text -noout

# Test SSL connection
openssl s_client -connect localhost:2443 -servername localhost
```

### Health Check

```bash
# Check server status
curl -k https://localhost:2443/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "protocol": "https",
  "port": 2443
}
```

## ❓ FAQ

### Q: Apakah bisa menggunakan HTTPS dan HTTP bersamaan?

A: Ya, aplikasi akan listen di kedua port jika dikonfigurasi:

```env
ENABLE_HTTPS=true
HTTPS_PORT=2443
HTTP_PORT=2000
FORCE_HTTPS=false
```

### Q: Bagaimana cara update certificate?

A: **Development:**
```bash
npm run generate-ssl
```

**Production:**
```bash
# Let's Encrypt auto-renewal
sudo certbot renew

# Restart aplikasi
sudo systemctl restart ttu-app
```

### Q: Apakah mendukung HTTP/2?

A: Ya, set `ENABLE_HTTP2=true` (requires HTTPS):

```env
ENABLE_HTTPS=true
ENABLE_HTTP2=true
```

### Q: Bagaimana cara disable HTTPS?

A: Set `ENABLE_HTTPS=false` di `.env`:

```env
ENABLE_HTTPS=false
```

### Q: Certificate expired, bagaimana cara handle?

A: **Development:**
```bash
# Generate certificate baru
npm run generate-ssl
```

**Production:**
```bash
# Renew Let's Encrypt
sudo certbot renew --force-renewal

# Atau replace dengan certificate baru
```

## 📚 Additional Resources

- [Fastify HTTPS Documentation](https://www.fastify.io/docs/latest/Reference/Server/#https)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)

## 🤝 Support

Jika mengalami masalah:

1. Check logs: `LOG_LEVEL=debug npm run dev:https`
2. Validate environment: Script akan otomatis validate
3. Test certificates: `npm run test:https`
4. Check documentation di atas

---

**Happy Secure Coding! 🔒✨**
