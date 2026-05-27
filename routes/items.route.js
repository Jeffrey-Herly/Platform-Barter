'use strict';

const { authMiddleware } = require('../middlewares/auth.middleware.js');

module.exports = async function (fastify, opts) {
    // Inject dependencies
    const ItemsRepository = require('../repositories/items.repository.js');
    const ItemsService = require('../services/items.service.js');
    const ItemsController = require('../controllers/items.controller.js');

    // Initialize dependencies
    const itemsRepository = new ItemsRepository(fastify.pg);
    const itemsService = new ItemsService(itemsRepository);
    const itemsController = new ItemsController(itemsService);

    // Register routes with /items prefix
    fastify.register(async function itemsRoutes(fastify) {
        /**
         * GET /items/search
         * Display search items page
         */
        fastify.get('/search', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return itemsController.searchPage(request, reply);
        });

        /**
         * GET /items/create
         * Display create item page
         */
        fastify.get('/create', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return itemsController.createItemPage(request, reply);
        });

        /**
         * GET /items/:id
         * Display item detail page
         */
        fastify.get('/:id', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return itemsController.viewItemPage(request, reply);
        });

        /**
         * GET /items/:id/edit
         * Display edit item page
         */
        fastify.get('/:id/edit', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return itemsController.editItemPage(request, reply);
        });

    }, { prefix: '/items' });
};
