import fastifyView from '@fastify/view';
import fastifyFormbody from '@fastify/formbody';
import Fastify from 'fastify';
import nunjucks from 'nunjucks';
import { join } from 'path';
import { getHTTPSConfig, isHTTPSEnabled } from '../../config/ssl.js';
import { getServerConfig } from '../../config/environment.js';

// Get server configuration
const serverConfig = getServerConfig();
const httpsEnabled = isHTTPSEnabled();

// Base Fastify options
const fastifyOptions = {
  logger: {
    level: serverConfig.logging.level,
    transport: serverConfig.logging.prettyPrint ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        colorize: true
      }
    } : undefined
  }
};

// Add HTTPS configuration if enabled
if (httpsEnabled) {
  const httpsConfig = getHTTPSConfig(serverConfig.environment);
  if (httpsConfig.https) {
    Object.assign(fastifyOptions, httpsConfig);
    console.log("🔒 HTTPS configuration loaded");
  } else {
    console.warn("⚠️  HTTPS requested but certificates not found, falling back to HTTP");
  }
}

const app = Fastify(fastifyOptions);
console.log("berhasil membuat instance fastify");

// Register form body parser for handling form data and JSON
app.register(fastifyFormbody);
console.log("berhasil mendaftarkan form body parser");

// daftarkan direktori view sebagai tempat penyimpanan file template
app.register(fastifyView, {
  engine: {
    nunjucks: nunjucks
  },
  root: join(process.cwd(), 'src/views'),
  layout: false,
  options: {
    nunjucks: {
        noCache: true,
        watch: false
    }
  }
});
console.log("berhasil mendaftarkan view");

// Add HTTPS security middleware
if (httpsEnabled || serverConfig.security.forceHttps) {
  // HTTPS redirect middleware
  app.addHook('onRequest', async (request, reply) => {
    // Skip redirect for health checks and API calls in development
    if (request.url.startsWith('/health') || request.url.startsWith('/api/health')) {
      return;
    }
    
    // Force HTTPS redirect if not using HTTPS
    if (serverConfig.security.forceHttps && !request.headers['x-forwarded-proto'] && request.protocol !== 'https') {
      const httpsUrl = `https://${request.hostname}:${serverConfig.https.port}${request.url}`;
      return reply.redirect(301, httpsUrl);
    }
  });

  // Security headers middleware
  app.addHook('onSend', async (request, reply, payload) => {
    // HSTS (HTTP Strict Transport Security)
    reply.header('Strict-Transport-Security', 
      `max-age=${serverConfig.security.hstsMaxAge}${serverConfig.security.hstsIncludeSubDomains ? '; includeSubDomains' : ''}`
    );
    
    // Additional security headers
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    return payload;
  });
  
  console.log("🛡️  HTTPS security middleware registered");
}

export default app;