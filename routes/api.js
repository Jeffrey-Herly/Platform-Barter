'use strict';

const { authMiddleware } = require('../middlewares/auth.middleware.js');

module.exports = async function (fastify, opts) {
    // Inject dependencies
    const DashboardRepository = require('../repositories/dashboard.repository.js');
    const DashboardService = require('../services/dashboard.service.js');
    const ItemsRepository = require('../repositories/items.repository.js');
    const ItemsService = require('../services/items.service.js');
    const DashboardController = require('../controllers/dashboard.controller.js');

    // Initialize dependencies
    const dashboardRepository = new DashboardRepository(fastify.pg);
    const dashboardService = new DashboardService(dashboardRepository);
    const itemsRepository = new ItemsRepository(fastify.pg);
    const itemsService = new ItemsService(itemsRepository);
    const dashboardController = new DashboardController(dashboardService, itemsService);

    // Register routes with /api prefix
    fastify.register(async function apiRoutes(fastify) {
        /**
         * GET /api/dashboard
         * Get dashboard overview data
         */
        fastify.get('/dashboard', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.getDashboardAPI(request, reply);
        });

        /**
         * GET /api/dashboard/profile
         * Get user profile data
         */
        fastify.get('/dashboard/profile', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.getProfileAPI(request, reply);
        });

        /**
         * GET /api/dashboard/items
         * Get user items with pagination
         */
        fastify.get('/dashboard/items', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.getItemsAPI(request, reply);
        });

        /**
         * GET /api/dashboard/notifications
         * Get user notifications with pagination
         */
        fastify.get('/dashboard/notifications', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.getNotificationsAPI(request, reply);
        });

        /**
         * GET /api/dashboard/wishlist
         * Get user wishlist with pagination
         */
        fastify.get('/dashboard/wishlist', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.getWishlistAPI(request, reply);
        });

        /**
         * POST /api/dashboard/wishlist
         * Add item to wishlist
         */
        fastify.post('/dashboard/wishlist', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.addWishlistItemAPI(request, reply);
        });

        /**
         * POST /api/dashboard/notifications/:id/read
         * Mark notification as read
         */
        fastify.post('/dashboard/notifications/:id/read', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.markNotificationAsReadAPI(request, reply);
        });

        /**
         * POST /api/dashboard/notifications/read-all
         * Mark all notifications as read
         */
        fastify.post('/dashboard/notifications/read-all', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.markAllNotificationsAsReadAPI(request, reply);
        });

        /**
         * DELETE /api/dashboard/notifications/:id
         * Delete a notification
         */
        fastify.delete('/dashboard/notifications/:id', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.deleteNotificationAPI(request, reply);
        });

        /**
         * PUT /api/dashboard/profile
         * Update user profile
         */
        fastify.put('/dashboard/profile', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.updateProfileAPI(request, reply);
        });

        /**
         * POST /api/dashboard/profile/avatar
         * Upload / update profile avatar image
         */
        fastify.post('/dashboard/profile/avatar', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.uploadProfileAvatarAPI(request, reply);
        });

        /**
         * POST /api/dashboard/profile/cover
         * Upload / update profile cover/banner image
         */
        fastify.post('/dashboard/profile/cover', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.uploadProfileCoverAPI(request, reply);
        });

        /**
         * DELETE /api/dashboard/wishlist/:id
         * Delete wishlist item
         */
        fastify.delete('/dashboard/wishlist/:id', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.deleteWishlistItemAPI(request, reply);
        });

        /**
         * POST /api/dashboard/items
         * Create new item
         */
        fastify.post('/dashboard/items', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.createItemAPI(request, reply);
        });

        /**
         * GET /api/dashboard/items/:id
         * Get item detail
         */
        fastify.get('/dashboard/items/:id', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.getItemDetailAPI(request, reply);
        });

        /**
         * PUT /api/dashboard/items/:id
         * Update item
         */
        fastify.put('/dashboard/items/:id', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.updateItemAPI(request, reply);
        });

        /**
         * DELETE /api/dashboard/items/:id
         * Delete item
         */
        fastify.delete('/dashboard/items/:id', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.deleteItemAPI(request, reply);
        });

        /**
         * POST /api/users/:id/reviews
         * Create review for another user (from public profile)
         */
        fastify.post('/users/:id/reviews', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.createUserReviewAPI(request, reply);
        });

        /**
         * POST /api/users/:id/report
         * Create fraud/abuse report for another user (from public profile)
         */
        fastify.post('/users/:id/report', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.createUserReportAPI(request, reply);
        });

    }, { prefix: '/api' });
};
