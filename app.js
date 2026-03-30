'use strict'

const path = require('node:path')
const fs = require('node:fs')
const AutoLoad = require('@fastify/autoload')


// HTTPS configuration for local development
// Solves Chrome/Edge ERR_ALPN_NEGOTIATION_FAILED with localhost
const certKeyPath = path.join(__dirname, 'certs', 'cert.key')
const certCrtPath = path.join(__dirname, 'certs', 'cert.crt')

const options = {
  bodyLimit: 10 * 1024 * 1024 // 10MB - support base64 image upload via JSON
}

// Enable HTTPS if certificate files exist
if (fs.existsSync(certKeyPath) && fs.existsSync(certCrtPath)) {
  options.https = {
    key: fs.readFileSync(certKeyPath),
    cert: fs.readFileSync(certCrtPath)
  }
  console.log('🔒 HTTPS enabled with self-signed certificate')
} else {
  console.log('⚠️  No certs found, running HTTP only. Run: npx mkcert create-ca && npx mkcert create-cert')
}

module.exports = async function (fastify, opts) {
  // Initialize upload directory
  const { initializeUploadDir } = require('./utils/file-upload');
  try {
    await initializeUploadDir();
  } catch (error) {
    console.error('Failed to initialize upload directory:', error);
  }

  fastify.setValidatorCompiler(({ schema }) => {
    const Ajv = require('ajv')
    const ajv = new Ajv({
      removeAdditional: 'all',
      useDefaults: true,
      coerceTypes: true,
      allErrors: true  // ← Required untuk ajv-errors
    })

    // Enable ajv-errors
    require('ajv-errors')(ajv)

    // Add format validation (email, uri, etc)
    require('ajv-formats')(ajv)

    return ajv.compile(schema)
  })

  // Root route - redirect to auth page
  fastify.get('/', async (request, reply) => {
    return reply.redirect('/auth/')
  })

  // Register generic support plugins
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts)
  })

  // Register API routes
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({}, opts)
  })
}

module.exports.options = options
