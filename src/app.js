import app from './lib/fastify.js';
import registerRoutes from './routes/routes.js';
import { getPortConfig, isHTTPSEnabled } from '../config/ssl.js';
import { validateEnvironment } from '../config/environment.js';

app.setErrorHandler(function (error, request, reply) {
  // Log error
  this.log.error(error);
});

await registerRoutes(app);

// root
app.get('/', async (request, reply) => {
  // Redirect to /index
  console.log('redirect to /index');
  return reply.redirect('/login');
});

// Validate environment configuration
const envValidation = validateEnvironment();
if (!envValidation.isValid) {
  console.error('❌ Environment validation failed:');
  envValidation.errors.forEach(error => console.error(`   - ${error}`));
  process.exit(1);
}

// Show warnings if any
if (envValidation.warnings.length > 0) {
  console.warn('⚠️  Environment warnings:');
  envValidation.warnings.forEach(warning => console.warn(`   - ${warning}`));
}

// Get server configuration
const httpsEnabled = isHTTPSEnabled();
const portConfig = getPortConfig(httpsEnabled);

// Add health check endpoint
app.get('/health', async (request, reply) => {
  return { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    protocol: httpsEnabled ? 'https' : 'http',
    port: portConfig.port
  };
});

// Define server connection
try {
  // Start server with appropriate configuration
  await app.listen(portConfig);

  // Give feedback that server is running
  const protocol = httpsEnabled ? 'https' : 'http';
  const serverUrl = `${protocol}://${portConfig.host}:${portConfig.port}/`;
  
  app.log.info(`🚀 Server is now running at ${serverUrl}`);
  
  if (httpsEnabled) {
    app.log.info('🔒 HTTPS is enabled');
    app.log.info('🛡️  Security headers are active');
  } else {
    app.log.warn('⚠️  Running in HTTP mode - consider enabling HTTPS for production');
  }
  
} catch (err) {
  // Throw error if server failed to start and exit the process
  app.log.error('❌ Failed to start server:', err);
  process.exit(1);
}