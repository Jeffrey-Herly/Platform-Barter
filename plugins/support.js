'use strict'

const fp = require('fastify-plugin')

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

module.exports = fp(async function (fastify, opts) {
  // Initialize DI Container if not exists
  if (!fastify.diContainer) {
    fastify.diContainer = {
      services: {},
      resolve: function(serviceName) {
        if (!this.services[serviceName]) {
          throw new Error(`Service ${serviceName} not found in DI container`);
        }
        return this.services[serviceName];
      },
      register: function(serviceName, service) {
        this.services[serviceName] = service;
      }
    };
  }

  fastify.decorate('someSupport', function () {
    return 'hugs'
  })

  // Wait for database to be ready
  fastify.addHook('onReady', async () => {
    // Register Repositories
    const TagsRepository = require('../repositories/tags.repository');
    const tagsRepository = new TagsRepository(fastify.pg);
    fastify.diContainer.register('tagsRepository', tagsRepository);
    
    console.log('[Support] ✓ Repositories initialized');
  });
})
