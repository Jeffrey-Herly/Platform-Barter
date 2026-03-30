# 🔒 HTTPS Quick Setup Guide

Panduan cepat untuk mengaktifkan HTTPS pada TTU Application.

## 🚀 Quick Start (3 Steps)

### 1. Generate SSL Certificates

```bash
npm run setup:https
```

### 2. Enable HTTPS

```bash
# Copy environment template
cp env.example .env

# Edit .env and set:
# ENABLE_HTTPS=true
```

### 3. Start Server

```bash
# Development dengan HTTPS
npm run dev:https

# Atau
ENABLE_HTTPS=true npm run dev
```

**Server akan berjalan di:**
- 🔒 HTTPS: https://localhost:2443
- 🌐 HTTP: http://localhost:2000 (jika tidak force redirect)

## 📋 Available Commands

```bash
# Generate SSL certificates
npm run generate-ssl

# Setup HTTPS (generate cert + instructions)
npm run setup:https

# Start development server dengan HTTPS
npm run dev:https

# Test endpoints
npm run test:http    # Test HTTP
npm run test:https   # Test HTTPS
```

## ⚙️ Environment Configuration

File: `.env`

```env
# Enable HTTPS
ENABLE_HTTPS=true

# Ports
HTTPS_PORT=2443
HTTP_PORT=2000

# Security (optional)
FORCE_HTTPS=false
HSTS_MAX_AGE=31536000

# HTTP/2 Support (optional)
ENABLE_HTTP2=false
```

## 🛡️ Security Features

- ✅ Self-signed certificates untuk development
- ✅ Production-ready SSL/TLS configuration
- ✅ Security headers (HSTS, CSP, dll.)
- ✅ HTTP to HTTPS redirect
- ✅ HTTP/2 support

## 🔧 Production Setup

1. **Get SSL Certificate:**
   ```bash
   # Let's Encrypt (free)
   sudo certbot certonly --standalone -d yourdomain.com
   ```

2. **Set Production Environment:**
   ```env
   NODE_ENV=production
   ENABLE_HTTPS=true
   SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
   SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
   FORCE_HTTPS=true
   ```

## 🆘 Troubleshooting

**Certificate not found:**
```bash
npm run generate-ssl
```

**Browser security warning (development):**
- Click "Advanced" → "Proceed to localhost (unsafe)"
- This is normal for self-signed certificates

**Permission denied on port 443:**
```bash
# Use sudo or change port
sudo npm start
# Or
HTTPS_PORT=2443 npm start
```

## 📚 Full Documentation

Untuk dokumentasi lengkap, lihat: [HTTPS_SETUP.md](./HTTPS_SETUP.md)

---

**Need help?** Check the full documentation atau jalankan `npm run test:https` untuk test koneksi.
