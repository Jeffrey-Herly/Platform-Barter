// src/routes/notification.route.js
'use strict';

const {
    getNotificationsSchema,
    getUnreadCountSchema,
    getNotificationsByTypeSchema,
    getRecentNotificationsSchema,
    markAsReadSchema,
    deleteNotificationSchema
} = require('../schemas/notification.schema.js');

const { authMiddleware } = require('../middlewares/auth.middleware.js');

module.exports = async function (fastify, opts) {
    // Initialize repositories
    const NotificationRepository = require('../repositories/notification.repository.js');
    const notificationRepository = new NotificationRepository(fastify.pg);

    // Initialize services
    const NotificationService = require('../services/notification.service.js');
    const notificationService = new NotificationService(notificationRepository);

    // Initialize controller
    const NotificationController = require('../controllers/notification.controller.js');
    const notificationController = new NotificationController(notificationService);

    // Register routes dengan auth middleware
    fastify.register(async function (fastify) {
        /**
         * GET /api/notifications
         * Get all notifications untuk current user
         */
        fastify.get('/', {
            preHandler: [authMiddleware],
            schema: getNotificationsSchema
        }, async (request, reply) => {
            return notificationController.getNotifications(request, reply);
        });

        /**
         * GET /api/notifications/unread/count
         * Get unread notification count
         */
        fastify.get('/unread/count', {
            preHandler: [authMiddleware],
            schema: getUnreadCountSchema
        }, async (request, reply) => {
            return notificationController.getUnreadCount(request, reply);
        });

        /**
         * GET /api/notifications/type/:type_name
         * Get notifications by type
         */
        fastify.get('/type/:type_name', {
            preHandler: [authMiddleware],
            schema: getNotificationsByTypeSchema
        }, async (request, reply) => {
            return notificationController.getNotificationsByType(request, reply);
        });

        /**
         * GET /api/notifications/recent
         * Get recent notifications untuk polling
         */
        fastify.get('/recent', {
            preHandler: [authMiddleware],
            schema: getRecentNotificationsSchema
        }, async (request, reply) => {
            return notificationController.getRecentNotifications(request, reply);
        });

        /**
         * PATCH /api/notifications/:notification_id/read
         * Mark notification as read
         */
        fastify.patch('/:notification_id/read', {
            preHandler: [authMiddleware],
            schema: markAsReadSchema
        }, async (request, reply) => {
            return notificationController.markAsRead(request, reply);
        });

        /**
         * PATCH /api/notifications/mark-all/read
         * Mark all notifications as read
         */
        fastify.patch('/mark-all/read', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return notificationController.markAllAsRead(request, reply);
        });

        /**
         * POST /api/notifications/mark-all/read
         * Alias untuk mark all as read (beberapa client lebih mudah pakai POST)
         */
        fastify.post('/mark-all/read', {
            preHandler: [authMiddleware]
        }, async (request, reply) => {
            return notificationController.markAllAsRead(request, reply);
        });

        /**
         * DELETE /api/notifications/:notification_id
         * Delete notification
         */
        fastify.delete('/:notification_id', {
            preHandler: [authMiddleware],
            schema: deleteNotificationSchema
        }, async (request, reply) => {
            return notificationController.deleteNotification(request, reply);
        });
    }, { prefix: '/api/notifications' });
};
