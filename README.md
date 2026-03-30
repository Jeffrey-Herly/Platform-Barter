# TTU Platform - Platform Barter

Platform barter modern menggunakan Fastify dengan dukungan HTTPS dan sistem modularitas.

## 🚀 Features

- ✅ **Fastify Framework** - High performance web framework
- ✅ **HTTPS Support** - SSL/TLS encryption dengan auto-generated certificates
- ✅ **Modular Architecture** - Sistem modularitas untuk reusable functions
- ✅ **Security Headers** - HSTS, CSP, dan security headers lainnya
- ✅ **Environment Configuration** - Flexible environment setup
- ✅ **HTTP/2 Support** - Modern protocol support
- ✅ **Auto SSL Generation** - Self-signed certificates untuk development

## 🔧 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup HTTPS (Optional)

```bash
# Generate SSL certificates untuk development
npm run setup:https

# Copy environment template
cp env.example .env

# Edit .env dan set ENABLE_HTTPS=true jika ingin menggunakan HTTPS
```

### 3. Start Server

```bash
# HTTP mode (default)
npm run dev

# HTTPS mode
npm run dev:https
```

**Server URLs:**
- 🌐 HTTP: http://localhost:2000
- 🔒 HTTPS: https://localhost:2443

## 📋 Available Scripts

```bash
npm run dev          # Start development server (HTTP)
npm run dev:https    # Start development server (HTTPS)
npm run start        # Start production server
npm run setup:https  # Generate SSL certificates
npm run test:http    # Test HTTP endpoint
npm run test:https   # Test HTTPS endpoint
```

## 🔒 HTTPS Configuration

### Quick Setup

```bash
# 1. Generate certificates
npm run setup:https

# 2. Enable HTTPS in .env
ENABLE_HTTPS=true

# 3. Start server
npm run dev:https
```

### Documentation

- 📖 [HTTPS Quick Guide](./docs/HTTPS_QUICK_GUIDE.md)
- 📚 [Complete HTTPS Setup](./docs/HTTPS_SETUP.md)

## 🏗️ Project Structure

```
TTU/
├── config/              # Configuration files
│   ├── ssl.js          # SSL/HTTPS configuration
│   ├── environment.js  # Environment management
│   └── database.js     # Database configuration
├── src/
│   ├── app.js          # Main application
│   ├── lib/            # Core libraries
│   ├── routes/         # API routes
│   ├── views/          # Templates (Nunjucks)
│   └── module/         # Modular functions
│       ├── utils/      # Utility functions
│       ├── services/   # Business logic
│       └── validators/ # Data validation
├── scripts/            # Utility scripts
├── ssl/dev/           # Development SSL certificates
└── docs/              # Documentation
```

## 🛡️ Security Features

- **HTTPS Encryption** - TLS 1.2+ support
- **Security Headers** - HSTS, CSP, X-Frame-Options, dll.
- **HTTP Redirect** - Automatic HTTP to HTTPS redirect
- **Certificate Management** - Auto-generated development certificates
- **Environment Validation** - Configuration validation on startup

## 🔧 Environment Variables

```env
# Server Configuration
ENABLE_HTTPS=false
HTTPS_PORT=2443
HTTP_PORT=2000
HOST=localhost

# Security
FORCE_HTTPS=false
HSTS_MAX_AGE=31536000

# SSL Certificates (Production)
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

## 📚 Documentation

- [HTTPS Setup Guide](./docs/HTTPS_SETUP.md) - Complete HTTPS configuration
- [Module System](./src/module/README.md) - Modular architecture guide
- [Quick HTTPS Guide](./docs/HTTPS_QUICK_GUIDE.md) - Fast setup instructions

## 🤝 Development

### Adding New Modules

```javascript
// src/module/utils/myHelper.js
export function myFunction(param) {
  return result;
}

// Usage in routes
import { myFunction } from '../module/utils/myHelper.js';
```

### HTTPS Development

```bash
# Generate new certificates
npm run generate-ssl

# Test HTTPS locally
npm run dev:https
curl -k https://localhost:2443/health
```

## 📞 Support

Jika mengalami masalah:

1. Check dokumentasi di `docs/`
2. Validate environment: `LOG_LEVEL=debug npm run dev`
3. Test endpoints: `npm run test:https`

---

**Happy Coding! 🚀**
