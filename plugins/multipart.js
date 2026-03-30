'use strict'

const fp = require('fastify-plugin')
const fastifyMultipart = require('@fastify/multipart')

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

module.exports = fp(async function (fastify, opts) {
  fastify.register(fastifyMultipart, {
    limits: {
      fieldNameSize: 100,     // Max field name size in bytes
      fieldSize: 1000000,     // Max field value size in bytes (1MB)
      fields: 10,             // Max number of non-file fields
      fileSize: 5 * 1024 * 1024, // Max file size in bytes (5MB)
      files: 5,               // Max number of file fields
      headerPairs: 2000       // Max number of header key=>value pairs
    }
  })
})
