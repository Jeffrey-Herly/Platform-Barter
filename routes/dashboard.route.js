'use strict';

const { authMiddleware } = require('../middlewares/auth.middleware.js');

module.exports = async function (fastify, opts) {
    // Inject dependencies
    const DashboardRepository = require('../repositories/dashboard.repository.js');
    const DashboardService = require('../services/dashboard.service.js');
    const DashboardController = require('../controllers/dashboard.controller.js');

    // Initialize dependencies
    const dashboardRepository = new DashboardRepository(fastify.pg);
    const dashboardService = new DashboardService(dashboardRepository);
    const dashboardController = new DashboardController(dashboardService);

    // Register routes with /dashboard prefix
    fastify.register(async function dashboardRoutes(fastify) {
        /**
         * GET /dashboard
         * Display main dashboard page
         */
        fastify.get('/', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.getDashboard(request, reply);
        });

        /**
         * GET /dashboard/profile
         * Display user profile page
         */
        fastify.get('/profile', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.getProfile(request, reply);
        });

        /**
         * GET /dashboard/items
         * Display user items page
         */
        fastify.get('/items', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.getItems(request, reply);
        });

        /**
         * GET /dashboard/notifications
         * Display notifications page
         */
        fastify.get('/notifications', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.getNotifications(request, reply);
        });

        /**
         * GET /dashboard/wishlist
         * Display wishlist page
         */
        fastify.get('/wishlist', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.getWishlist(request, reply);
        });

        /**
         * GET /dashboard/reviews
         * Display reviews page with pagination
         */
        fastify.get('/reviews', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.getReviews(request, reply);
        });

        /**
         * POST /dashboard/profile/upload-avatar
         * Native form upload for avatar (multipart) - works on all browsers
         */
        fastify.post('/profile/upload-avatar', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.uploadAvatarForm(request, reply);
        });

        /**
         * POST /dashboard/profile/upload-cover
         * Native form upload for cover banner (multipart) - works on all browsers
         */
        fastify.post('/profile/upload-cover', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return dashboardController.uploadCoverForm(request, reply);
        });

    }, { prefix: '/dashboard' });

    /**
     * GET /users/:id
     * Display public profile page for another user
     */
    fastify.get('/users/:id', {
        preHandler: [authMiddleware]
    }, async (request, reply) => {
        return dashboardController.getPublicProfile(request, reply);
    });
};

