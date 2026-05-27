'use strict';

const { authMiddleware } = require('../middlewares/auth.middleware.js');

module.exports = async function (fastify, opts) {
    // Inject dependencies
    const ItemsRepository = require('../repositories/items.repository.js');
    const ItemsService = require('../services/items.service.js');
    const ApiItemsController = require('../controllers/api.items.controller.js');

    // Initialize dependencies
    const itemsRepository = new ItemsRepository(fastify.pg);
    const itemsService = new ItemsService(itemsRepository);
    const apiItemsController = new ApiItemsController(itemsService);

    // Register API items routes dengan explicit prefix /api/items
    fastify.register(async function apiItemsRoutes(fastify) {
        /**
         * GET /api/items
         * Get user items with pagination
         */
        fastify.get('/', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return apiItemsController.getUserItems(request, reply);
        });

        /**
         * POST /api/items
         * Create new item
         */
        fastify.post('/', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return apiItemsController.createItem(request, reply);
        });

        /**
         * GET /api/items/recommended
         * Get recommended items (newest/highest view count)
         * IMPORTANT: Must be BEFORE /search to avoid parameter matching
         */
        fastify.get('/recommended', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return apiItemsController.getRecommendedItems(request, reply);
        });

        /**
         * GET /api/items/search
         * Search items
         * IMPORTANT: Must be BEFORE /:id route to avoid parameter matching
         */
        fastify.get('/search', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return apiItemsController.searchItems(request, reply);
        });

        /**
         * GET /api/items/my-items
         * Get current user's items (for dropdowns/modals)
         * IMPORTANT: Must be BEFORE /:id route to avoid parameter matching
         */
        fastify.get('/my-items', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return apiItemsController.getMyItems(request, reply);
        });

        /**
         * GET /api/items/category/:id
         * Get items by category
         * IMPORTANT: Must be BEFORE /:id route to avoid parameter matching
         */
        fastify.get('/category/:id', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return apiItemsController.getItemsByCategory(request, reply);
        });

        /**
         * PUT /api/items/images/reorder
         * Reorder item images
         * IMPORTANT: Must be BEFORE /images/:id route to avoid parameter matching
         */
        fastify.put('/images/reorder', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return apiItemsController.reorderImages(request, reply);
        });

        /**
         * DELETE /api/items/images/:id
         * Delete item image
         */
        fastify.delete('/images/:id', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return apiItemsController.deleteImage(request, reply);
        });

        /**
         * GET /api/items/:id
         * Get item detail
         * IMPORTANT: Must be AFTER specific routes like /search, /category/:id, etc
         */
        fastify.get('/:id', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return apiItemsController.getItemDetail(request, reply);
        });

        /**
         * PUT /api/items/:id
         * Update item
         */
        fastify.put('/:id', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return apiItemsController.updateItem(request, reply);
        });

        /**
         * POST /api/items/:id
         * Update item (HTML form compatibility)
         * Alias dari PUT untuk mendukung form submission standar
         */
        fastify.post('/:id', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return apiItemsController.updateItem(request, reply);
        });

        /**
         * DELETE /api/items/:id
         * Delete item
         */
        fastify.delete('/:id', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return apiItemsController.deleteItem(request, reply);
        });

    }, { prefix: '/api/items' }); // ← IMPORTANT: Set prefix untuk API items routes
};
